import { BotanicalEntity } from '../src/types.js';
import { BotanicalResolveResult } from './types.js';
import { BOTANICAL_DATABASE } from './botanicalData.js';

/**
 * Standard Levenshtein edit distance algorithm
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalize text for matching
 */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim()
    .replace(/^the /i, '')
    .replace(/ extract$/i, '')
    .replace(/ powder$/i, '');
}

/**
 * Resolve a botanical entity from input string
 */
export function resolveBotanical(input: string, plantPart?: string): BotanicalResolveResult {
  const normalizedInput = normalizeText(input);
  
  const candidates: Array<{ 
    entity: BotanicalEntity; 
    score: number; 
    matchType: 'exact' | 'alias' | 'fuzzy' | 'partial' 
  }> = [];

  for (const entity of BOTANICAL_DATABASE) {
    let maxScore = 0;
    let matchType: 'exact' | 'alias' | 'fuzzy' | 'partial' = 'partial';

    const namesToMatch = [
      { name: entity.sanskritName, type: 'exact' as const },
      { name: entity.hindiName, type: 'alias' as const },
      { name: entity.commonName, type: 'alias' as const },
      { name: entity.botanicalName, type: 'exact' as const },
    ].filter(n => Boolean(n.name));

    for (const item of namesToMatch) {
      const normalizedName = normalizeText(item.name);
      if (normalizedInput === normalizedName) {
        if (1.0 > maxScore) {
          maxScore = 1.0;
          matchType = item.type;
        }
      } else if (normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName)) {
        if (0.5 > maxScore) {
          maxScore = 0.5;
          matchType = 'partial';
        }
      } else {
        const dist = levenshteinDistance(normalizedInput, normalizedName);
        if (dist <= 2 && 0.7 > maxScore) {
          maxScore = 0.7;
          matchType = 'fuzzy';
        }
      }
    }
    
    if (entity.botanicalName) {
      const genus = entity.botanicalName.split(' ')[0];
      if (normalizeText(genus) === normalizedInput && 0.8 > maxScore) {
        maxScore = 0.8;
        matchType = 'partial';
      }
    }

    if (maxScore > 0) {
      candidates.push({ entity, score: maxScore, matchType });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return { 
      matches: [], 
      bestMatch: null, 
      confidence: 0 
    };
  }

  // Check for conflicts
  let conflictWarning: string | undefined;
  if (candidates.length > 1 && candidates[0].score === candidates[1].score && candidates[0].entity.id !== candidates[1].entity.id) {
    conflictWarning = `Input matches two or more different species equally well: ${candidates.map(c => c.entity.botanicalName).join(', ')}`;
  }

  const best = candidates[0].entity;
  const confidence = candidates[0].score;

  let validPart: boolean | undefined = undefined;
  if (plantPart) {
    const normalizedPart = normalizeText(plantPart);
    validPart = best.plantPartsUsed.some(p => normalizeText(p).includes(normalizedPart));
  }

  const matches = candidates.map(c => ({
    id: c.entity.id,
    sanskritName: c.entity.sanskritName,
    commonName: c.entity.commonName,
    botanicalName: c.entity.botanicalName,
    family: c.entity.family,
    confidence: c.score,
    matchType: c.matchType
  }));

  const bestMatch = {
    id: best.id,
    sanskritName: best.sanskritName,
    commonName: best.commonName,
    botanicalName: best.botanicalName,
    family: best.family
  };

  return {
    matches,
    bestMatch,
    confidence,
    conflictWarning,
    plantPartValid: validPart
  };
}

/**
 * Search botanicals
 */
export function searchBotanicals(query: string): BotanicalEntity[] {
  const normalizedQuery = normalizeText(query);
  const results: BotanicalEntity[] = [];

  for (const entity of BOTANICAL_DATABASE) {
    const names = [
      entity.sanskritName,
      entity.hindiName,
      entity.commonName,
      entity.botanicalName
    ].filter(Boolean) as string[];

    if (names.some(n => normalizeText(n).includes(normalizedQuery))) {
      results.push(entity);
    }
  }

  return results;
}

/**
 * Validate a plant part against known parts
 */
export function validatePlantPart(botanicalId: string, plantPart: string): { valid: boolean; knownParts: string[] } {
  const entity = BOTANICAL_DATABASE.find(b => b.id === botanicalId);
  if (!entity) {
    return { valid: false, knownParts: [] };
  }

  const normalizedPart = normalizeText(plantPart);
  const valid = entity.plantPartsUsed.some(p => normalizeText(p).includes(normalizedPart));

  return { valid, knownParts: entity.plantPartsUsed };
}

/**
 * Get aliases for botanical entity
 */
export function getBotanicalAliases(id: string): string[] {
  const entity = BOTANICAL_DATABASE.find(b => b.id === id);
  if (!entity) {
    return [];
  }

  return [
    entity.sanskritName,
    entity.hindiName,
    entity.commonName,
    entity.botanicalName
  ].filter(Boolean) as string[];
}
