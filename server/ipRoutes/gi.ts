import type { Product, Jurisdiction, EvidenceItem } from '../../src/types.js';
import type { GIRouteResult } from '../types.js';

export function evaluateGIRoute(product: Product, jurisdiction: Jurisdiction, corpus: EvidenceItem[]): GIRouteResult {
  const result: GIRouteResult = {
    routeName: 'Geographical Indication (GI)',
    relevance: 'NOT_APPLICABLE',
    evidence: [],
    risks: [],
    unknowns: [],
    nextSteps: [],
    humanReviewTrigger: false,
    applicableGIs: [],
    geographicOverlap: false
  };

  const knownGIs = ['Malabar Pepper', 'Kashmir Saffron', 'Navara Rice', 'Darjeeling Tea'];
  
  for (const ingredient of product.ingredients) {
    for (const gi of knownGIs) {
      if (
        (ingredient.commonName && ingredient.commonName.toLowerCase().includes(gi.toLowerCase())) ||
        (ingredient.sanskritName && ingredient.sanskritName.toLowerCase().includes(gi.toLowerCase()))
      ) {
        result.applicableGIs.push(gi);
        result.geographicOverlap = true;
        result.relevance = 'MEDIUM';
      }
    }
  }

  // Check if product name uses geographically linked names
  for (const gi of knownGIs) {
    if (product.name.toLowerCase().includes(gi.toLowerCase())) {
        result.applicableGIs.push(gi);
        result.geographicOverlap = true;
        result.relevance = 'HIGH';
    }
  }

  if (result.geographicOverlap) {
    result.risks.push('Product name or ingredients overlap with known Geographical Indications.');
    result.nextSteps.push('Ensure authorized user status if sourcing from GI regions or rebranding if unrelated.');
    result.humanReviewTrigger = true;
    
    const giAct = corpus.find(e => e.id === 'gi-act-2000');
    if (giAct) {
        result.evidence.push(giAct);
    } else {
        result.evidence.push({
            id: 'gi-act-2000',
            authority: 'GI Registry',
            framework: 'Geographical Indications of Goods Act, 1999',
            section: 'Section 22',
            jurisdiction: 'INDIA',
            title: 'Infringement of registered geographical indications',
            passage: 'A registered geographical indication is infringed by a person who, not being an authorised user thereof, uses such geographical indication by any means in the designations or presentation of goods that indicates or suggests that such goods originate in a geographical area other than the true place of origin of such goods in a manner which misleads the persons as to the geographical origin of such goods.',
            strength: 'HIGH',
            sourceUrl: '',
            version: '1.0',
            effectiveDate: '2003-09-15'
        });
    }
  } else {
    result.unknowns.push('Confirm if any proprietary ingredients are linked to specific geographic origins.');
  }

  return result;
}
