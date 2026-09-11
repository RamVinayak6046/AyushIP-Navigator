import type { Product, Jurisdiction, EvidenceItem } from '../../src/types.js';
import type { TradeSecretRouteResult } from '../types.js';

export function evaluateTradeSecretRoute(product: Product, jurisdiction: Jurisdiction, corpus: EvidenceItem[]): TradeSecretRouteResult {
  const result: TradeSecretRouteResult = {
    routeName: 'Trade Secret',
    relevance: 'LOW',
    evidence: [],
    risks: [],
    unknowns: [],
    nextSteps: [],
    humanReviewTrigger: false,
    protectableProcesses: [],
    ndaRecommendation: false
  };

  if (product.hasNovelProcess) {
    result.relevance = 'HIGH';
    result.protectableProcesses.push('Proprietary Shodhana');
    result.protectableProcesses.push('Marana');
    result.protectableProcesses.push('Extraction parameters');
    result.protectableProcesses.push('Fermentation protocols');
    
    result.ndaRecommendation = true;
    result.nextSteps.push('Execute Non-Disclosure Agreements (NDAs) with all employees and contractors.');
    result.nextSteps.push('Implement strict physical and digital access controls for manufacturing protocols.');
  }

  const tsEvidence = corpus.find(e => e.id === 'trade-secrets-india');
  if (tsEvidence) {
      result.evidence.push(tsEvidence);
  } else {
      result.evidence.push({
      id: 'trade-secrets-india',
      authority: 'Courts of India',
      framework: 'Indian Contract Act / IT Act Section 72',
      section: 'Common Law',
      jurisdiction: 'INDIA',
      title: 'Protection of Trade Secrets',
      passage: 'Trade secrets are protected in India under common law principles of breach of confidence, contract law, and the IT Act.',
      strength: 'HIGH',
      sourceUrl: '',
      version: '1.0',
      effectiveDate: '1872-09-01'
    });
  }

  if (jurisdiction === 'INTERNATIONAL') {
      const tripsArt39 = corpus.find(e => e.id === 'trips-art-39');
      if (tripsArt39) {
          result.evidence.push(tripsArt39);
      } else {
          result.evidence.push({
              id: 'trips-art-39',
              authority: 'WTO',
              framework: 'TRIPS',
              section: 'Article 39',
              jurisdiction: 'INTERNATIONAL',
              title: 'Protection of Undisclosed Information',
              passage: 'Natural and legal persons shall have the possibility of preventing information lawfully within their control from being disclosed to, acquired by, or used by others without their consent in a manner contrary to honest commercial practices.',
              strength: 'HIGH',
              sourceUrl: '',
              version: '1.0',
              effectiveDate: '1995-01-01'
          });
      }
  }

  return result;
}
