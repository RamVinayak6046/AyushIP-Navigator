import type { Product, Jurisdiction, EvidenceItem } from '../../src/types.js';
import type { CopyrightRouteResult } from '../types.js';

export function evaluateCopyrightRoute(product: Product, jurisdiction: Jurisdiction, corpus: EvidenceItem[]): CopyrightRouteResult {
  const result: CopyrightRouteResult = {
    routeName: 'Copyright',
    relevance: 'MEDIUM',
    evidence: [],
    risks: [],
    unknowns: [],
    nextSteps: [],
    humanReviewTrigger: false,
    protectableElements: []
  };

  // Assess protectable elements
  result.protectableElements.push('Label artwork');
  result.protectableElements.push('Original packaging design');
  result.protectableElements.push('Literary compilations');

  const crAct = corpus.find(e => e.id === 'copyright-act-1957'); 
  if (crAct) {
    result.evidence.push(crAct);
  } else {
    result.evidence.push({
      id: 'copyright-act-1957',
      authority: 'Copyright Office',
      framework: 'Copyright Act, 1957',
      section: 'Section 13',
      jurisdiction: 'INDIA',
      title: 'Works in which copyright subsists',
      passage: 'Copyright subsists in original literary, dramatic, musical and artistic works.',
      strength: 'HIGH',
      sourceUrl: '',
      version: '1.0',
      effectiveDate: '1958-01-21'
    });
  }

  result.nextSteps.push('Register copyright for original label artwork and product literature.');
  result.nextSteps.push('Ensure assignment agreements are executed with external designers or agencies.');

  return result;
}
