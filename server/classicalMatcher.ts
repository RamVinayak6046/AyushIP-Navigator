import { ClassicalYoga, Product, EvidenceItem } from '../src/types.js';
import { ClassicalMatchResult, ClassicalMatch } from './types.js';
import { CLASSICAL_YOGAS } from './botanicalData.js';
import { normalizeText, levenshteinDistance } from './botanicalResolver.js';
import { AUTHORITATIVE_CORPUS } from './corpus.js';

/**
 * Match product against classical yogas
 */
export function matchClassicalFormulation(product: Partial<Product>): ClassicalMatchResult {
  const possibleMatches: ClassicalMatch[] = [];
  const partialMatches: ClassicalMatch[] = [];
  let exactMatch = false;
  let tkFlag = false;
  let tkFlagReason: string | undefined;
  const allUnmatchedIngredients: Set<string> = new Set();
  const evidenceItems: EvidenceItem[] = [];

  for (const yoga of CLASSICAL_YOGAS) {
    let nameScore = 0;
    if (product.name) {
      const normalizedProductName = normalizeText(product.name);
      const normalizedYogaName = normalizeText(yoga.name);

      if (normalizedProductName === normalizedYogaName) {
        nameScore = 1.0;
      } else if (normalizedProductName.includes(normalizedYogaName) || normalizedYogaName.includes(normalizedProductName)) {
        nameScore = 0.9;
      } else {
        const dist = levenshteinDistance(normalizedProductName, normalizedYogaName);
        if (dist <= 2) {
          nameScore = 0.7;
        }
      }
    }

    let ingredientsScore = 0;
    const matchedIngredients: string[] = [];
    const unmatchedIngredients: string[] = [];
    
    if (product.ingredients && product.ingredients.length > 0) {
      const productIngNames = product.ingredients.map(i => 
        normalizeText(i.sanskritName || i.commonName || (i as any).name || '')
      ).filter(Boolean);
      
      for (const requiredIng of yoga.primaryIngredients) {
        const normalizedRequired = normalizeText(requiredIng);
        if (productIngNames.some(p => p.includes(normalizedRequired) || normalizedRequired.includes(p))) {
          matchedIngredients.push(requiredIng);
        } else {
          unmatchedIngredients.push(requiredIng);
          allUnmatchedIngredients.add(requiredIng);
        }
      }

      if (yoga.primaryIngredients.length > 0) {
        ingredientsScore = matchedIngredients.length / yoga.primaryIngredients.length;
      }
    }

    let matchScore = Math.max(nameScore, ingredientsScore);
    const dosageFormMatch = Boolean(product.dosageForm && yoga.dosageForm &&
      normalizeText(product.dosageForm) === normalizeText(yoga.dosageForm));
    
    if (dosageFormMatch) {
      matchScore = Math.min(1.0, matchScore + 0.1);
    }

    let matchType: 'exact_name' | 'exact_ingredients' | 'partial_ingredients' | 'indication' = 'partial_ingredients';
    if (nameScore >= 0.9) matchType = 'exact_name';
    else if (ingredientsScore >= 0.9) matchType = 'exact_ingredients';

    const matchObj: ClassicalMatch = {
      yogaId: yoga.id,
      yogaName: yoga.name,
      sanskritName: yoga.sanskritName,
      authoritativeText: yoga.authoritativeText,
      chapterSection: yoga.chapterSection,
      matchScore,
      matchType,
      matchedIngredients,
      unmatchedIngredients,
      dosageFormMatch
    };

    if (matchScore >= 0.9) {
      exactMatch = true;
      possibleMatches.push(matchObj);
    } else if (matchScore >= 0.5) {
      partialMatches.push(matchObj);
      possibleMatches.push(matchObj);
    }

    if (matchScore >= 0.6) {
      tkFlag = true;
      if (!tkFlagReason) {
        tkFlagReason = `Product shares ≥60% ingredients with ${yoga.name} described in ${yoga.authoritativeText}, ${yoga.chapterSection}. This is a source-backed Traditional Knowledge pointer, not a legal conclusion.`;
      }
    }
  }

  if (tkFlag) {
    for (const item of AUTHORITATIVE_CORPUS) {
      if (item.passage.includes('Section 3(p)') || item.section.includes('3(p)') || (item.tags && item.tags.includes('tk'))) {
        evidenceItems.push(item);
      }
    }
  }

  return {
    possibleMatches,
    exactMatch,
    partialMatches,
    unmatchedIngredients: Array.from(allUnmatchedIngredients),
    tkFlag,
    tkFlagReason,
    evidenceItems
  };
}

/**
 * Get classical yoga by name
 */
export function getClassicalYogaByName(name: string): ClassicalYoga | undefined {
  const normalized = normalizeText(name);
  return CLASSICAL_YOGAS.find(y => 
    normalizeText(y.name) === normalized || 
    normalizeText(y.sanskritName) === normalized
  );
}

/**
 * Find all classical yogas by ingredient
 */
export function getClassicalYogasByIngredient(ingredientName: string): ClassicalYoga[] {
  const normalized = normalizeText(ingredientName);
  return CLASSICAL_YOGAS.filter(yoga => 
    yoga.primaryIngredients.some(ing => normalizeText(ing).includes(normalized))
  );
}
