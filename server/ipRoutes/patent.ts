import type { Product, Jurisdiction, EvidenceItem } from '../../src/types.js';
import type { PatentRouteResult } from '../types.js';

export function evaluatePatentRoute(product: Product, jurisdiction: Jurisdiction, corpus: EvidenceItem[]): PatentRouteResult {
  const result: PatentRouteResult = {
    routeName: 'Patent',
    relevance: 'NOT_APPLICABLE',
    evidence: [],
    risks: [],
    unknowns: [],
    nextSteps: [],
    humanReviewTrigger: false,
    noveltyAssessment: 'Requires detailed review',
    inventiveStepAssessment: 'Requires detailed review',
    priorArtMatches: [],
    exclusionsApplicable: [],
    productVsProcess: 'Unknown',
    disclosureRequirements: [],
    foreignFilingConsiderations: []
  };

  let isRelevant = false;

  // Section 3(p) TK bar
  if (product.isClassicalTextBased) {
    result.exclusionsApplicable.push('Section 3(p) - Traditional Knowledge bar');
    result.risks.push('Classical text based products are generally not patentable under Section 3(p) of the Patents Act due to traditional knowledge.');
    isRelevant = true;
    const sec3p = corpus.find(e => e.id === 'patents-act-3p');
    if (sec3p) result.evidence.push(sec3p);
  }

  // Section 3(e) mere admixture
  if (product.ingredients && product.ingredients.length > 1) {
    result.exclusionsApplicable.push('Section 3(e) - Mere admixture bar');
    result.risks.push('Multiple ingredients require clear synergy evidence to overcome Section 3(e).');
    isRelevant = true;
    const sec3e = corpus.find(e => e.id === 'patents-act-3e');
    if (sec3e) result.evidence.push(sec3e);
  }
  
  // Section 3(d) known efficacy
  if (product.classification === 'CLASSICAL_GENERIC' || product.isClassicalTextBased) {
    result.exclusionsApplicable.push('Section 3(d) - Known efficacy bar');
    result.risks.push('Must demonstrate enhanced therapeutic efficacy over known substances under Section 3(d).');
    isRelevant = true;
    const sec3d = corpus.find(e => e.id === 'patents-act-3d');
    if (sec3d) result.evidence.push(sec3d);
  }

  // Assess product vs process
  if (!product.hasNovelProcess) {
    result.productVsProcess = 'Product patent may be difficult due to botanical nature. Consider process patent if novel manufacturing steps exist.';
  } else {
    result.productVsProcess = 'Novel process indicates potential for a process patent.';
    isRelevant = true;
  }

  // Section 10(4) biological origin disclosure
  if (product.ingredients && product.ingredients.length > 0) {
    result.disclosureRequirements.push('Section 10(4) requires disclosure of source and geographical origin of biological materials.');
    const sec10 = corpus.find(e => e.id === 'patents-act-10-4');
    if (sec10) result.evidence.push(sec10);
  }

  // International considerations
  if (jurisdiction === 'INTERNATIONAL') {
    result.foreignFilingConsiderations.push('TRIPS Art 27.3(b) allows exclusion of plants and animals from patentability.');
    result.foreignFilingConsiderations.push('Consider PCT filing for international protection timelines.');
    result.foreignFilingConsiderations.push('WIPO GRATK disclosure requirements may be triggered for traditional knowledge.');
    result.humanReviewTrigger = true;
    const trips = corpus.find(e => e.id === 'trips-art-27');
    if (trips) result.evidence.push(trips);
  }

  if (isRelevant) {
    result.relevance = 'MEDIUM';
    result.nextSteps.push('Conduct formal prior art search for novelty.');
    result.nextSteps.push('Gather quantitative evidence of synergy for admixtures to overcome 3(e).');
  }

  if (result.risks.length > 2) {
    result.humanReviewTrigger = true;
  }

  return result;
}
