import { Intent, IntentResult, Product } from './types.js';

/**
 * Classifies a user query into an AyushIP Navigator specific Intent.
 * @param query The user's input query text.
 * @param productContext Optional product context for identifying missing facts.
 * @returns The resulting primary intent, confidence, secondary intents, and missing facts.
 */
export function classifyIntent(query: string, productContext?: Product | any): IntentResult {
  const normalizedQuery = query.toLowerCase();

  const intentKeywords: Record<string, string[]> = {
    PATENTABILITY: ['patent', 'patentable', 'patentability', 'section 3', 'inventive step', 'novelty'],
    NOVELTY_PRIOR_ART: ['novelty', 'prior art', 'prior-art', 'existing patent', 'already patented', 'anticipation'],
    TRADITIONAL_KNOWLEDGE: ['traditional knowledge', 'tkdl', 'prior art', 'ancient', 'classical text', 'charaka', 'sushruta'],
    ABS_BIODIVERSITY: ['abs', 'biodiversity', 'biological diversity', 'nba', 'sbb', 'form 1', 'form 3', 'benefit sharing', 'nagoya', 'cbd'],
    TRADEMARK: ['trademark', 'trade mark', 'brand', 'logo', 'section 9', 'class 5', 'class 3'],
    GI: ['geographical indication', 'gi', 'geographical', 'malabar', 'kashmir', 'navara', 'darjeeling'],
    COPYRIGHT: ['copyright', 'literary', 'label artwork', 'original work'],
    DESIGN: ['design', 'industrial design', 'packaging', 'designs act'],
    TRADE_SECRET: ['trade secret', 'confidential', 'nda', 'proprietary process', 'undisclosed'],
    PLANT_VARIETY: ['plant variety', 'cultivar', 'ppvfr', 'farmers rights', 'dus', 'seed'],
    PRODUCT_CLASSIFICATION: ['classify', 'classification', 'classical', 'proprietary', 'patent medicine', 'ayurveda aahar'],
    AYUSH_LICENSING: ['license', 'licensing', 'form 25d', 'rule 158', 'drug license', 'cdsco', 'ayush'],
    SAFETY_TESTING: ['safety', 'toxicity', 'oecd', 'heavy metal', 'testing', 'clinical trial'],
    LABELLING: ['label', 'labelling', 'labeling', 'rule 161', 'fssai', 'packaging requirements'],
    ADVERTISING_CLAIMS: ['advertising', 'claims', 'dmr act', 'magic remedies', 'disease claim'],
    EXPORT_MARKET_ACCESS: ['export', 'market access', 'fda', 'eu', 'uk', 'uae', 'dshea', 'thmpd'],
    TREATY_OBLIGATIONS: ['treaty', 'wipo', 'gratk', 'trips', 'pct', 'madrid', 'hague', 'budapest'],
    SOURCE_DOCUMENT_LOOKUP: ['source', 'document', 'find', 'lookup', 'show me', 'what does', 'section say']
  };

  const intentScores = new Map<string, number>();

  for (const [intentKey, keywords] of Object.entries(intentKeywords)) {
    let score = 0;
    for (const kw of keywords) {
      if (normalizedQuery.includes(kw)) {
        score += 1;
      }
    }
    if (score > 0) {
      // Calculate confidence (cap at 1.0)
      intentScores.set(intentKey, Math.min(score / Math.min(keywords.length, 3), 1.0));
    }
  }

  if (intentScores.size === 0) {
    return {
      intent: 'GENERAL_UNSUPPORTED' as Intent,
      confidence: 1.0,
      secondaryIntents: [],
      missingFacts: []
    };
  }

  // Sort by score descending
  const sortedIntents = Array.from(intentScores.entries()).sort((a, b) => b[1] - a[1]);
  
  const primaryIntent = sortedIntents[0][0] as Intent;
  const primaryScore = sortedIntents[0][1];
  
  const secondaryIntents = sortedIntents.slice(1).map(entry => entry[0] as Intent);
  
  const missingFacts: string[] = [];
  
  if (primaryIntent === 'PATENTABILITY' && !productContext?.ingredients) {
    missingFacts.push('List of ingredients');
  }
  if (primaryIntent === 'ABS_BIODIVERSITY' && !productContext?.biologicalResources) {
    missingFacts.push('List of biological resources and source locations');
  }

  return {
    intent: primaryIntent,
    confidence: primaryScore,
    secondaryIntents,
    missingFacts
  };
}
