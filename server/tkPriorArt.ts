import { AUTHORITATIVE_CORPUS } from './corpus.js';
import { BOTANICAL_DATABASE, CLASSICAL_YOGAS } from './botanicalData.js';
import { Product, Jurisdiction, EvidenceItem } from '../src/types.js';
import { TKPriorArtResult, ConfidenceLevel } from './types.js';

/**
 * Searches for TK / Prior-Art based on the provided product and jurisdiction.
 * @param product Partial product information
 * @param jurisdiction Jurisdiction string or object
 * @returns TKPriorArtResult containing prior art evidence
 */
export function searchTKPriorArt(product: Partial<Product>, jurisdiction: Jurisdiction): TKPriorArtResult {
  const classicalReferences: Array<{ source: string; text: string; chapter: string; relevance: number }> = [];
  const tkdlMatches: string[] = [];
  const evidenceItems: EvidenceItem[] = [];

  // Search CLASSICAL_YOGAS for ingredient overlap with product
  if (product.ingredients && product.ingredients.length > 0) {
    const ingNames = product.ingredients.map(i => (i.sanskritName || i.commonName || (i as any).name || '').toLowerCase()).filter(Boolean);

    for (const yoga of CLASSICAL_YOGAS) {
      const matched = yoga.primaryIngredients.filter(pi => 
        ingNames.some(name => pi.toLowerCase().includes(name) || name.includes(pi.toLowerCase()))
      );
      if (matched.length > 0) {
        const relevance = matched.length / yoga.primaryIngredients.length;
        classicalReferences.push({
          source: yoga.authoritativeText,
          text: `${yoga.name} (${yoga.sanskritName}) - Indication: ${yoga.classicalIndication}`,
          chapter: yoga.chapterSection,
          relevance: Math.round(relevance * 100) / 100
        });
      }
    }
  }

  // Search BOTANICAL_DATABASE for TKDL references and famous revocation cases
  if (product.ingredients && product.ingredients.length > 0) {
    for (const ingredient of product.ingredients) {
      const botanicalName = (ingredient.botanicalName || '').toLowerCase();
      const sanskritName = (ingredient.sanskritName || '').toLowerCase();
      const commonName = (ingredient.commonName || '').toLowerCase();

      const botanicalMatch = BOTANICAL_DATABASE.find(b => 
        b.botanicalName.toLowerCase().includes(botanicalName) ||
        b.sanskritName.toLowerCase() === sanskritName ||
        b.commonName.toLowerCase() === commonName
      );

      if (botanicalMatch && botanicalMatch.tkdlReference) {
        let matchStr = `${botanicalMatch.sanskritName} (${botanicalMatch.botanicalName}): ${botanicalMatch.tkdlReference}`;
        if (botanicalMatch.famousRevocationCase) {
          matchStr += ` - Revocation Precedent: ${botanicalMatch.famousRevocationCase}`;
        }
        tkdlMatches.push(matchStr);
      }
    }
  }

  // Search AUTHORITATIVE_CORPUS for Section 3(p), TKDL entries matching jurisdiction
  for (const item of AUTHORITATIVE_CORPUS) {
    if (item.jurisdiction === jurisdiction && (
      item.id === 'patents-act-3p' ||
      item.id === 'wipo-gratk-treaty-2024' ||
      item.tags?.includes('tk') ||
      item.passage.toLowerCase().includes('traditional knowledge')
    )) {
      evidenceItems.push(item);
    }
  }

  let priorArtStrength: ConfidenceLevel = 'LOW';
  if (classicalReferences.length >= 2 || tkdlMatches.length >= 2) {
    priorArtStrength = 'HIGH';
  } else if (classicalReferences.length > 0 || tkdlMatches.length > 0) {
    priorArtStrength = 'MEDIUM';
  }

  return {
    classicalReferences,
    tkdlMatches,
    evidenceItems,
    jurisdiction,
    priorArtStrength,
    disclaimer: 'Prior art search is indicative, not exhaustive. A comprehensive search requires TKDL portal access and professional patent search services. Never claim a patent is invalid from a keyword hit alone.'
  };
}
