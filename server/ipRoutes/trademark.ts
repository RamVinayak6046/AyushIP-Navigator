import type { Product, Jurisdiction, EvidenceItem } from '../../src/types.js';
import type { TrademarkRouteResult } from '../types.js';

export function evaluateTrademarkRoute(product: Product, jurisdiction: Jurisdiction, corpus: EvidenceItem[]): TrademarkRouteResult {
  const result: TrademarkRouteResult = {
    routeName: 'Trademark',
    relevance: 'HIGH',
    evidence: [],
    risks: [],
    unknowns: [],
    nextSteps: [],
    humanReviewTrigger: false,
    niceClasses: [],
    genericNameConflict: false,
    sanskritDescriptiveBar: false,
    registryDisclaimer: 'Trademark availability requires live registry search. This assessment identifies potential statutory bars only.'
  };

  // Nice classification assignment
  if (product.classification === 'COSMETIC') {
    result.niceClasses.push('Class 3 (Cosmetic)');
  } else if (product.classification === 'AYURVEDA_AAHAR') {
    result.niceClasses.push('Class 30 (Food)');
  } else {
    result.niceClasses.push('Class 5 (Medicinal)');
  }

  // Check generic Sanskrit botanical name bar
  const productNameLower = product.name.toLowerCase();
  for (const ingredient of product.ingredients) {
    if (
      (ingredient.sanskritName && productNameLower.includes(ingredient.sanskritName.toLowerCase())) ||
      (ingredient.commonName && productNameLower.includes(ingredient.commonName.toLowerCase()))
    ) {
      result.genericNameConflict = true;
      result.sanskritDescriptiveBar = true;
      result.risks.push(`Product name contains generic descriptive term '${ingredient.sanskritName || ingredient.commonName}' which may face absolute grounds for refusal under TM Act Section 9(1)(b)/(c).`);
      
      const tmAct9 = corpus.find(e => e.id === 'tm-act-9-1'); 
      if (tmAct9) {
        result.evidence.push(tmAct9);
      } else {
        result.evidence.push({
          id: 'tm-act-9-1',
          authority: 'Trademark Registry',
          framework: 'Trade Marks Act 1999',
          section: 'Section 9(1)(b)/(c)',
          jurisdiction: 'INDIA',
          title: 'Absolute grounds for refusal',
          passage: 'Trademarks which consist exclusively of marks or indications which may serve in trade to designate the kind, quality, quantity, intended purpose, values, geographical origin or the time of production of the goods or rendering of the service or other characteristics of the goods or service; or which have become customary in the current language or in the bona fide and established practices of the trade, shall not be registered.',
          strength: 'HIGH',
          sourceUrl: '',
          version: '1.0',
          effectiveDate: '1999-12-30'
        });
      }
      
      result.humanReviewTrigger = true;
      break;
    }
  }

  result.nextSteps.push('Conduct comprehensive trademark availability search in the Trademark Registry.');
  
  return result;
}
