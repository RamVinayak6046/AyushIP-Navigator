import type { Product, Jurisdiction, EvidenceItem } from '../../src/types.js';
import type { DesignRouteResult } from '../types.js';

export function evaluateDesignRoute(product: Product, jurisdiction: Jurisdiction, corpus: EvidenceItem[]): DesignRouteResult {
  const result: DesignRouteResult = {
    routeName: 'Design',
    relevance: 'MEDIUM',
    evidence: [],
    risks: [],
    unknowns: [],
    nextSteps: [],
    humanReviewTrigger: false,
    designElements: []
  };

  result.designElements.push('Unique packaging');
  result.designElements.push('Container shape');
  result.designElements.push('Device design');

  const designAct = corpus.find(e => e.id === 'designs-act-2000');
  if (designAct) {
    result.evidence.push(designAct);
  } else {
    result.evidence.push({
      id: 'designs-act-2000',
      authority: 'Patent Office',
      framework: 'Designs Act 2000',
      section: 'Section 4',
      jurisdiction: 'INDIA',
      title: 'Prohibition of registration of certain designs',
      passage: 'A design which is not new or original, or has been disclosed to the public anywhere in India or in any other country by publication in tangible form or by use or in any other way prior to the filing date, or is not significantly distinguishable from known designs, shall not be registered.',
      strength: 'HIGH',
      sourceUrl: '',
      version: '1.0',
      effectiveDate: '2001-05-11'
    });
  }

  result.risks.push('Design registration requires absolute novelty. Do not disclose the design publicly before filing.');
  result.nextSteps.push('Assess packaging for novel shapes or patterns eligible for design protection.');

  return result;
}
