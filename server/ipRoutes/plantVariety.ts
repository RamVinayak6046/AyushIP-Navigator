import type { Product, Jurisdiction, EvidenceItem } from '../../src/types.js';
import type { PlantVarietyRouteResult } from '../types.js';

export function evaluatePlantVarietyRoute(product: Product, jurisdiction: Jurisdiction, corpus: EvidenceItem[]): PlantVarietyRouteResult {
  const result: PlantVarietyRouteResult = {
    routeName: 'Plant Variety',
    relevance: 'NOT_APPLICABLE',
    evidence: [],
    risks: [],
    unknowns: [],
    nextSteps: [],
    humanReviewTrigger: false,
    cultivarsIdentified: [],
    ppvfrApplicable: false
  };

  let hasCultivars = false;
  
  for (const ingredient of product.ingredients) {
      if (
          (ingredient.commonName && ingredient.commonName.toLowerCase().includes('cultivar')) ||
          (ingredient.botanicalName && ingredient.botanicalName.toLowerCase().includes(' var. ')) ||
          (ingredient.botanicalName && ingredient.botanicalName.toLowerCase().includes(' cultivar '))
      ) {
          hasCultivars = true;
          result.cultivarsIdentified.push(ingredient.botanicalName || ingredient.commonName);
      }
  }

  if (hasCultivars) {
    result.relevance = 'HIGH';
    result.ppvfrApplicable = true;
    result.nextSteps.push('Determine if the identified cultivars are extant or new varieties eligible for registration.');
    result.humanReviewTrigger = true;
  }

  const ppvfrAct = corpus.find(e => e.id === 'ppvfr-act-2001');
  if (ppvfrAct) {
      result.evidence.push(ppvfrAct);
  } else {
      result.evidence.push({
      id: 'ppvfr-act-2001',
      authority: 'PPV&FR Authority',
      framework: 'PPVFR Act 2001',
      section: 'Section 14/15',
      jurisdiction: 'INDIA',
      title: 'Registration of Plant Varieties',
      passage: 'Provides for the registration of new, extant, and farmers varieties of plants.',
      strength: 'HIGH',
      sourceUrl: '',
      version: '1.0',
      effectiveDate: '2001-10-30'
    });
  }

  return result;
}
