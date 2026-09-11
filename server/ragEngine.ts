import { EvidenceItem, Citation, Jurisdiction, Product, AssessmentResult, ProductClassification } from '../src/types.js';
import { AUTHORITATIVE_CORPUS } from './corpus.js';
import { BOTANICAL_DATABASE, CLASSICAL_YOGAS } from './botanicalData.js';
import { knowledgeStore } from './knowledge.js';
import { semanticIndex, cosine } from './semanticIndex.js';

export interface SearchFilter {
  jurisdiction: Jurisdiction;
  query: string;
  tags?: string[];
  minScore?: number;
}

/**
 * Shared statutory section boost function used by both sparse search and hybrid RRF.
 * Gives large score bonuses when the query specifically mentions a statutory provision
 * and the document covers that exact provision.
 */
function applyStatutoryBoosts(normalizedQuery: string, doc: EvidenceItem): number {
  let boost = 0;
  if (normalizedQuery.includes('3(p)') && doc.section.includes('3(p)')) boost += 50;
  if (normalizedQuery.includes('3(e)') && doc.section.includes('3(e)')) boost += 50;
  if (normalizedQuery.includes('158-b') && doc.section.includes('158-B')) boost += 50;
  if (normalizedQuery.includes('abs') && (doc.id.includes('bda') || doc.id.includes('nagoya'))) boost += 35;
  if (normalizedQuery.includes('patent') && (doc.id.includes('patent') || doc.id.includes('wipo'))) boost += 25;
  if (normalizedQuery.includes('traditional knowledge') && (doc.id.includes('3p') || doc.id.includes('gratk'))) boost += 35;
  if (normalizedQuery.includes('aahar') && doc.id.includes('aahar')) boost += 50;
  if (normalizedQuery.includes('advertising') && doc.id.includes('dmr')) boost += 50;
  if (normalizedQuery.includes('export') && (doc.jurisdiction === 'INTERNATIONAL')) boost += 25;
  if (normalizedQuery.includes('plant variety') && doc.id.includes('ppvfr')) boost += 50;
  if (normalizedQuery.includes('ppvfr') && doc.id.includes('ppvfr')) boost += 50;
  if (normalizedQuery.includes('cultivar') && doc.id.includes('ppvfr')) boost += 35;
  if (normalizedQuery.includes('farmer') && doc.id.includes('ppvfr')) boost += 35;
  if (normalizedQuery.includes('trade secret') && doc.id.includes('trade-secret')) boost += 50;
  if (normalizedQuery.includes('nda') && doc.id.includes('trade-secret')) boost += 50;
  if (normalizedQuery.includes('confidential') && doc.id.includes('trade-secret')) boost += 35;
  if (normalizedQuery.includes('budapest') && doc.id.includes('budapest')) boost += 50;
  if (normalizedQuery.includes('microorganism') && doc.id.includes('budapest')) boost += 50;
  if (normalizedQuery.includes('ferment') && doc.id.includes('budapest')) boost += 35;
  if ((normalizedQuery.includes('bhasma') || normalizedQuery.includes('heavy metal') || normalizedQuery.includes('mercury') || normalizedQuery.includes('marana')) && (doc.id.includes('uae') || doc.id.includes('eu-thmpd'))) boost += 35;
  if (normalizedQuery.includes('3(d)') && doc.section.includes('3(d)')) boost += 50;
  if (normalizedQuery.includes('section 10') && doc.section.includes('10(4)')) boost += 50;
  if (normalizedQuery.includes('phyto') && doc.id.includes('phyto')) boost += 50;
  if (normalizedQuery.includes('dshea') && doc.id.includes('dshea')) boost += 50;
  if (normalizedQuery.includes('thmpd') && doc.id.includes('thmpd')) boost += 50;
  if (normalizedQuery.includes('dmr') && doc.id.includes('dmr')) boost += 50;
  if (normalizedQuery.includes('trademark') && doc.id.includes('tm-act')) boost += 50;
  if (normalizedQuery.includes('geographical indication') && doc.id.includes('gi-act')) boost += 50;
  if (normalizedQuery.includes('nagoya') && doc.id.includes('nagoya')) boost += 50;
  if (normalizedQuery.includes('cultivat') && doc.id.includes('section-7')) boost += 40;
  return boost;
}

/**
 * Compute the full lexical score for a document against a query.
 */
function computeLexicalScore(normalizedQuery: string, queryTokens: string[], doc: EvidenceItem): number {
  let score = 0;
  const textToSearch = `${doc.title} ${doc.framework} ${doc.section} ${doc.passage} ${(doc.tags || []).join(' ')}`.toLowerCase();
  // Exact phrase match bonus
  if (textToSearch.includes(normalizedQuery)) score += 40;
  // Keyword token matches
  for (const token of queryTokens) {
    if (textToSearch.includes(token)) score += 10;
  }
  // Statutory boosts
  score += applyStatutoryBoosts(normalizedQuery, doc);
  return score;
}

export interface SearchResult {
  evidence: EvidenceItem[];
  citations: Citation[];
  totalSearched: number;
  relevantCount: number;
  topScore: number;
  isAbstentionTriggered: boolean;
  abstentionReason?: string;
  retrievalMethod?: 'HYBRID_RRF' | 'SPARSE_FALLBACK';
}

export class RAGEngine {
  /**
   * Hybrid retrieval combining lexical exact-token matching and semantic keyword matching
   * strictly partitioned by active jurisdiction.
   */
  public search(filter: SearchFilter): SearchResult {
    const { jurisdiction, query } = filter;
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return { evidence: [], citations: [], totalSearched: 0, relevantCount: 0, topScore: 0, isAbstentionTriggered: true, abstentionReason: 'A question is required before evidence retrieval.' };
    }

    // Safety guard: prediction/guarantee requests or synthetic molecules are not answerable under Ayush statutes
    const speculativeTriggers = [
      'who will win', 'guarantee patent grant', 'predict judicial ruling',
      'exact legal outcome', 'future court decision', 'secret unregistered text'
    ];
    const isSpeculative = speculativeTriggers.some(trigger => normalizedQuery.includes(trigger));

    const syntheticTriggers = [
      'piracetam', 'paracetamol', 'atorvastatin', 'sildenafil', 'ibuprofen', 'synthetic molecule', 'synthetic chemical', 'synthetic nootropic'
    ];
    const isSynthetic = syntheticTriggers.some(trigger => normalizedQuery.includes(trigger));

    // Filter corpus strictly by jurisdiction
    const scopedCorpus = [...AUTHORITATIVE_CORPUS, ...knowledgeStore.all()].filter(doc => doc.jurisdiction === jurisdiction);
    const totalSearched = scopedCorpus.length;

    if (isSpeculative) {
      return {
        evidence: [],
        citations: [],
        totalSearched,
        relevantCount: 0,
        topScore: 0,
        isAbstentionTriggered: true,
        abstentionReason: 'Query asks for speculative judicial prediction or cites hypothetical facts outside verified statutory records. Under Safe AI rules, authoritative decision-support cannot provide speculative legal conclusions without verifiable precedent.'
      };
    }

    if (isSynthetic) {
      return {
        evidence: [],
        citations: [],
        totalSearched,
        relevantCount: 0,
        topScore: 0,
        isAbstentionTriggered: true,
        abstentionReason: 'Query involves purely synthetic pharmaceutical molecules or non-botanical chemical substances that fall outside the statutory remit of the Ministry of Ayush and traditional Indian medicine frameworks.'
      };
    }

    // Tokenize query
    const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 2);

    // Apply optional tags filter
    let filteredCorpus = scopedCorpus;
    if (filter.tags && filter.tags.length > 0) {
      filteredCorpus = scopedCorpus.filter(doc => doc.tags && filter.tags!.some(t => doc.tags!.includes(t)));
      if (filteredCorpus.length === 0) filteredCorpus = scopedCorpus; // fallback to full corpus
    }

    // Score documents using shared lexical scorer
    const scoredDocs = filteredCorpus.map(doc => ({
      doc,
      score: computeLexicalScore(normalizedQuery, queryTokens, doc)
    }));

    // Sort by score descending
    scoredDocs.sort((a, b) => b.score - a.score);

    // Filter by relevance threshold
    const relevantScored = scoredDocs.filter(item => item.score >= 10);
    const topScore = relevantScored.length > 0 ? relevantScored[0].score : 0;

    // Check if evidence is insufficient
    if (relevantScored.length === 0 || topScore < 10) {
      return {
        evidence: [],
        citations: [],
        totalSearched,
        relevantCount: 0,
        topScore: 0,
        isAbstentionTriggered: true,
        abstentionReason: `No verified authoritative evidence found in the ${jurisdiction} corpus for this specific inquiry. Qualified professional review is recommended.`
      };
    }

    // Take top 4 most relevant evidence items
    const topEvidence = relevantScored.slice(0, 4).map(item => item.doc);

    // Build formal citations
    const citations: Citation[] = topEvidence.map(item => ({
      id: 'cit-' + item.id,
      authority: item.authority,
      document: item.framework,
      section: item.section,
      pageRecord: item.pageRecord || (item.pageNumber ? `Page ${item.pageNumber}` : item.version),
      source: item.sourceUrl,
      passage: item.passage
    }));

    return {
      evidence: topEvidence,
      citations,
      totalSearched,
      relevantCount: topEvidence.length,
      topScore,
      isAbstentionTriggered: false
    };
  }

  /**
   * Evidence-grounded hybrid retrieval: sparse lexical ranking + Gemini embeddings,
   * combined with Reciprocal Rank Fusion (RRF). Falls back to sparse search when
   * embeddings are unavailable so the prototype remains usable without an API key.
   */
  public async searchHybrid(filter: SearchFilter): Promise<SearchResult> {
    const lexical = this.search(filter);
    if (lexical.isAbstentionTriggered && lexical.relevantCount === 0) return lexical;

    const scopedCorpus = [...AUTHORITATIVE_CORPUS, ...knowledgeStore.all()].filter(d => d.jurisdiction === filter.jurisdiction);
    const queryVector = await semanticIndex.query(filter.query);
    if (!queryVector) {
      return { ...lexical, retrievalMethod: 'SPARSE_FALLBACK' };
    }

    const normalizedQuery = filter.query.toLowerCase().trim();
    const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 2);
    const lexicalRows = scopedCorpus.map(doc => ({
      doc,
      score: computeLexicalScore(normalizedQuery, queryTokens, doc)
    })).sort((a,b) => b.score-a.score);
    const lexRank = new Map(lexicalRows.map((r,i)=>[r.doc.id,i+1]));

    const semanticRows = scopedCorpus.map(doc => {
      const v = semanticIndex.get(doc.id);
      return { doc, score: v ? cosine(queryVector, v.vector) : 0 };
    }).sort((a,b)=>b.score-a.score);
    const semRank = new Map(semanticRows.map((r,i)=>[r.doc.id,{rank:i+1,score:r.score}]));

    const k = 60;
    const fused = scopedCorpus.map(doc => ({
      doc,
      rrf: (1 / (k + (lexRank.get(doc.id) || scopedCorpus.length + 1))) + (semRank.has(doc.id) ? 1 / (k + semRank.get(doc.id)!.rank) : 0),
      semanticScore: semRank.get(doc.id)?.score || 0,
      lexicalScore: (lexicalRows.find(x => x.doc.id === doc.id)?.score || 0)
    })).sort((a,b)=>b.rrf-a.rrf);

    const top = fused.filter(x => x.lexicalScore >= 10 || x.semanticScore >= 0.35).slice(0,4);
    if (!top.length || top[0].rrf <= 1/(k+scopedCorpus.length+1)) {
      return { ...lexical, evidence: [], citations: [], relevantCount: 0, topScore: 0, isAbstentionTriggered: true,
        abstentionReason: `Semantic + sparse retrieval did not find sufficiently relevant verified evidence in the ${filter.jurisdiction} corpus.` };
    }
    const evidence = top.map(x=>x.doc);
    const citations = evidence.map(item => ({ id:'cit-'+item.id, authority:item.authority, document:item.framework, section:item.section, pageRecord:item.pageRecord || (item.pageNumber ? `Page ${item.pageNumber}` : item.version), source:item.sourceUrl, passage:item.passage }));
    return {
      evidence, citations, totalSearched: scopedCorpus.length, relevantCount:evidence.length,
      topScore:top[0].rrf, isAbstentionTriggered:false, retrievalMethod:'HYBRID_RRF'
    };
  }

  /**
   * Classical Formulation Matching
   */
  public checkClassicalFormulation(product: Product): {
    isMatch: boolean;
    matchedYoga?: string;
    textReference?: string;
    indication?: string;
    isTraditionalKnowledge: boolean;
  } {
    const productIngredients = product.ingredients.map(i => i.sanskritName.toLowerCase());
    const productName = product.name.toLowerCase();

    for (const yoga of CLASSICAL_YOGAS) {
      if (productName.includes(yoga.name.toLowerCase()) || productName.includes(yoga.sanskritName.toLowerCase())) {
        return {
          isMatch: true,
          matchedYoga: yoga.name,
          textReference: `${yoga.authoritativeText} (${yoga.chapterSection})`,
          indication: yoga.classicalIndication,
          isTraditionalKnowledge: true
        };
      }

      // Check ingredient overlap
      const yogaIngredients = yoga.primaryIngredients.map(i => i.toLowerCase());
      const commonCount = productIngredients.filter(p => yogaIngredients.some(y => y.includes(p))).length;
      if (commonCount >= 3 && product.isClassicalTextBased) {
        return {
          isMatch: true,
          matchedYoga: yoga.name,
          textReference: `${yoga.authoritativeText} (${yoga.chapterSection})`,
          indication: yoga.classicalIndication,
          isTraditionalKnowledge: true
        };
      }
    }

    return {
      isMatch: false,
      isTraditionalKnowledge: product.ingredients.some(i => Boolean(i.tkdlFlag || i.traditionalRef))
    };
  }

  /**
   * Comprehensive Assessment Engine
   * Evaluates product against Patent, Trademark, GI, Design, ABS, Regulatory, and International pathways.
   */
  public async evaluateProduct(product: Product, jurisdiction: Jurisdiction): Promise<AssessmentResult> {
    // 1. Classical match & Traditional Knowledge check
    const classicalCheck = this.checkClassicalFormulation(product);
    const hasAshwagandha = product.ingredients.some(i => i.botanicalName.toLowerCase().includes('withania') || i.sanskritName.toLowerCase().includes('ashwa'));
    const hasTurmeric = product.ingredients.some(i => i.botanicalName.toLowerCase().includes('curcuma') || i.sanskritName.toLowerCase().includes('haridra'));
    const hasGuggulu = product.ingredients.some(i => i.botanicalName.toLowerCase().includes('commiphora') || i.sanskritName.toLowerCase().includes('guggul'));

    // 2. RAG Retrieval for the product context
    const query = `${product.name} ${product.classification} patent novelty traditional knowledge ABS regulatory ${product.ingredients.map(i => i.sanskritName).join(' ')}`;
    const searchResult = await this.searchHybrid({ jurisdiction, query });

    // 3. Evaluate Patent Route
    let patentStatus = 'Potentially relevant';
    let novelty: 'Requires detailed review' | 'Favorable' | 'Unlikely (Prior Art Exists)' = 'Requires detailed review';
    let inventiveStep: 'Requires detailed review' | 'Synergy Evidence Needed' | 'Favorable' = 'Requires detailed review';
    const exclusions: string[] = [];
    const priorArtMatches: string[] = [];
    const patentRecs: string[] = [];

    if (jurisdiction === 'INDIA') {
      if (product.classification === 'CLASSICAL_GENERIC') {
        patentStatus = 'High Risk of Patent Rejection';
        novelty = 'Unlikely (Prior Art Exists)';
        inventiveStep = 'Requires detailed review';
        exclusions.push('Section 3(p) - Traditional Knowledge Bar', 'Section 3(e) - Mere Admixture');
        priorArtMatches.push('Pre-existing classical formulation in First Schedule texts (e.g. Charaka / Bhaishajya Ratnavali; documented in TKDL)');
        patentRecs.push('Classical generic yogas cannot be patented as products. Consider protecting proprietary manufacturing apparatus or unique delivery systems under the Designs Act or Patents Act for apparatus only.');
      } else if (product.classification === 'PATENT_PROPRIETARY') {
        novelty = 'Requires detailed review';
        inventiveStep = 'Synergy Evidence Needed';
        exclusions.push('Section 3(p) - Traditional Knowledge Relevance', 'Section 3(e) - Synergy Demonstration Required');
        if (product.hasNovelProcess) {
          patentRecs.push('Process Patent Route: The extraction technique (e.g. Supercritical CO2 / targeted fractionation) is the strongest candidate for patent claims rather than the herbal composition itself.');
        }
        patentRecs.push('To overcome Section 3(e), submit comparative pharmacological bioassay data demonstrating a non-additive Synergistic Combination Index (CI < 1).');
        patentRecs.push('File Form 3 with the National Biodiversity Authority (NBA) prior to patent grant under Section 6 of the Biological Diversity Act.');
      } else if (product.classification === 'NEW_NON_CLASSICAL' || product.classification === 'PHYTOPHARMACEUTICAL') {
        novelty = 'Requires detailed review';
        inventiveStep = 'Favorable';
        patentRecs.push('Purified standardized fractions with defined chemical markers (min. 4 bioactives) hold substantial patent potential. Conduct exhaustive FTO (Freedom to Operate) and TKDL clearance search.');
      }
    } else {
      // INTERNATIONAL JURISDICTION
      patentStatus = 'Jurisdiction-Specific International Filing (PCT)';
      if (product.hasNovelProcess) {
        novelty = 'Requires detailed review';
        inventiveStep = 'Favorable';
      }
      patentRecs.push('Comply with Article 3 of the WIPO GRATK Treaty (2024): Mandatory disclosure of the Indian country of origin of biological materials and associated Traditional Knowledge.');
      patentRecs.push('US Patent Route: Herbal extracts face 35 U.S.C. 101 subject-matter eligibility hurdles under the Alice/Mayo framework (products of nature doctrine). Focus patent claims on modified formulations, specific particle sizing, or synthetic derivatives.');
      patentRecs.push('EPO Route: European Patent Office routinely issues third-party observations based on the Indian TKDL. Clear prior art citations before filing.');
      // Budapest Treaty guidance for fermented preparations
      if (product.dosageForm === 'ASAVA_ARISHTA' || product.description?.toLowerCase().includes('ferment')) {
        patentRecs.push('Budapest Treaty: For fermented preparations (Asava/Arishta) using novel starter cultures or microbial consortia, deposit the microorganism with an International Depositary Authority (IDA) such as MTCC (CSIR-IMTECH, Chandigarh) or MCC (Pune) before filing the patent application internationally.');
      }
    }

    if (hasAshwagandha) priorArtMatches.push('Withania somnifera documented in TKDL (Ref: CS-194; Charaka Chikitsasthana 1) for anti-stress & joint strength.');
    if (hasTurmeric) priorArtMatches.push('Curcuma longa documented in TKDL (Ref: CS-402; Charaka Sutrasthana 4) for inflammation & wound healing.');
    if (hasGuggulu) priorArtMatches.push('Commiphora mukul documented in TKDL (Ref: SS-089; Sushruta Samhita) for deep Lekhana and joint comfort.');

    const humanReviewFlags: string[] = [];
    // Extended prior art matching for new botanicals
    const hasBrahmi = product.ingredients.some(i => i.botanicalName.toLowerCase().includes('bacopa') || i.sanskritName.toLowerCase().includes('brahmi'));
    const hasArjuna = product.ingredients.some(i => i.botanicalName.toLowerCase().includes('terminalia arjuna') || i.sanskritName.toLowerCase().includes('arjuna'));
    const hasYashtimadhu = product.ingredients.some(i => i.botanicalName.toLowerCase().includes('glycyrrhiza') || i.sanskritName.toLowerCase().includes('yashtimadhu'));
    const hasKatuki = product.ingredients.some(i => i.botanicalName.toLowerCase().includes('picrorhiza') || i.sanskritName.toLowerCase().includes('katuki'));
    const hasJatamansi = product.ingredients.some(i => i.botanicalName.toLowerCase().includes('nardostachys') || i.sanskritName.toLowerCase().includes('jatamansi'));
    const hasKapikacchu = product.ingredients.some(i => i.botanicalName.toLowerCase().includes('mucuna') || i.sanskritName.toLowerCase().includes('kapikacchu'));
    const hasMaricha = product.ingredients.some(i => i.botanicalName.toLowerCase().includes('piper nigrum') || i.sanskritName.toLowerCase().includes('maricha'));
    const hasVacha = product.ingredients.some(i => i.botanicalName.toLowerCase().includes('acorus') || i.sanskritName.toLowerCase().includes('vacha'));
    const hasBhasma = product.ingredients.some(i => i.sanskritName.toLowerCase().includes('bhasma') || i.sanskritName.toLowerCase().includes('parada') || i.sanskritName.toLowerCase().includes('gandhaka'));
    const isFermented = product.dosageForm === 'ASAVA_ARISHTA' || product.description?.toLowerCase().includes('ferment');

    if (hasBrahmi) priorArtMatches.push('Bacopa monnieri documented in TKDL (Ref: CS-310; Charaka Chikitsasthana 1) as Medhya Rasayana for cognitive enhancement (Dhi, Dhriti, Smriti).');
    if (hasArjuna) priorArtMatches.push('Terminalia arjuna documented in TKDL (Ref: CS-015; Ashtanga Hridaya) as foremost Hridya (cardiotonic). Multiple international patents challenged using TKDL evidence.');
    if (hasYashtimadhu) priorArtMatches.push('Glycyrrhiza glabra documented in TKDL (Ref: CS-187; Charaka Sutrasthana 4) in Kanthya & Jivaniya groups. EU HMPC monograph exists.');
    if (hasKatuki) priorArtMatches.push('Picrorhiza kurroa documented in TKDL (Ref: CS-062). CITES Appendix II listed — ABS and sustainability compliance mandatory. Picrosides patents extensively filed.');
    if (hasJatamansi) priorArtMatches.push('Nardostachys jatamansi documented in TKDL (Ref: CS-054). CITES Appendix II — international trade strictly regulated. ABS compliance critical.');
    if (hasKapikacchu) priorArtMatches.push("Mucuna pruriens documented in TKDL (Ref: CS-075). Contains natural L-DOPA — creates IP overlap with pharmaceutical Parkinson's disease L-DOPA patents.");
    if (hasMaricha) priorArtMatches.push('Piper nigrum documented in TKDL (Ref: CS-102). Piperine bioenhancer patents challenged using Sharangadhara Samhita Trikatu Yogavahi prior art. Malabar Pepper GI #49.');
    if (hasVacha) {
      priorArtMatches.push('Acorus calamus documented in TKDL (Ref: CS-119). CRITICAL: Contains β-asarone — BANNED by US FDA (21 CFR 189.110). EU restricts β-asarone in food supplements.');
      humanReviewFlags.push('REGULATORY ALERT: Vacha (Acorus calamus) contains β-asarone, which is banned by the US FDA as a carcinogenic food additive. Export to USA requires diploid variety with <0.01% β-asarone content.');
    }

    // Bhasma / Heavy Metal Regulatory Flags
    if (hasBhasma) {
      humanReviewFlags.push('HEAVY METAL ALERT: Formulation contains Bhasma/Rasa Shastra preparations. EU, US, Australia, and Canada have strict heavy metal limits (Pb <10ppm, Hg <1ppm, As <3ppm, Cd <0.3ppm). Export viability severely limited unless rigorous ICP-MS testing demonstrates compliance.');
      patentRecs.push('Bhasma Marana (incineration) Process Patent: The specific Shodhana (purification) and Marana (calcination) protocols with defined temperature-time profiles, number of Puta (heating cycles), and particle characterization are highly patentable as process innovations.');
    }

    // Plant Variety Rights Assessment
    const plantVarietyRelevance = product.ingredients.some(i =>
      i.extractionMethod.toLowerCase().includes('cultivat') ||
      product.resourceSource === 'CULTIVATED'
    );
    if (plantVarietyRelevance && jurisdiction === 'INDIA') {
      patentRecs.push('Plant Variety Rights (PPVFR Act 2001): If using improved cultivars (e.g. high-withanolide Ashwagandha cv. "Pratap Shweta", high-curcumin Curcuma longa cv. "Pratibha"), verify whether the cultivar is registered under PPVFR. Registered varieties have 15-18 year exclusive propagation rights under Section 14/15. Farmers retain rights under Section 39(1)(iv) to save and resow produce.');
    }

    // Trade Secret Guidance
    if (product.hasNovelProcess) {
      patentRecs.push('Trade Secret Strategy: Proprietary extraction parameters, Shodhana protocols, fermentation starter compositions, and standardization SOPs can be protected as trade secrets via NDAs and restricted-access documentation (TRIPS Art 39.2). This complements patent filings — patent the novel process while keeping ancillary know-how as trade secrets.');
    }

    // Budapest Treaty for fermented preparations (Indian jurisdiction)
    if (isFermented && jurisdiction === 'INDIA') {
      patentRecs.push('Budapest Treaty (Indian IDA): For novel fermentation processes in Asava/Arishta or probiotic formulations, deposit the specific starter culture / yeast strain with MTCC (CSIR-IMTECH, Chandigarh) or MCC (Pune) before patent filing. A single Budapest Treaty deposit satisfies disclosure requirements across 87 member states.');
    }

    // 4. Trademark Module
    const brand = product.brandName || product.name;
    const isDescriptive = ['ashwagandha', 'haridra', 'guggulu', 'churna', 'vati', 'taila',
                           'brahmi', 'shatavari', 'tulasi', 'tulsi', 'amalaki', 'amla',
                           'pippali', 'shallaki', 'nimba', 'neem', 'guduchi', 'giloy',
                           'haritaki', 'bibhitaki', 'triphala', 'yashtimadhu', 'mulethi',
                           'arjuna', 'bala', 'punarnava', 'gokshura', 'chitraka',
                           'vidanga', 'bhringaraja', 'kumari', 'aloe', 'musta',
                           'jatamansi', 'katuki', 'kutki', 'kapikacchu', 'manjistha',
                           'daruharidra', 'sunthi', 'maricha', 'vacha', 'bhasma',
                           'kwatha', 'arishta', 'asava', 'ghrita', 'avaleha',
                           'rasayana', 'guggul', 'chyawanprash']
                          .some(term => brand.toLowerCase().includes(term));

    const trademarkClasses = product.classification === 'COSMETIC'
      ? ['Class 3 (Herbal Cosmetics, Oils, Soaps)']
      : product.classification === 'AYURVEDA_AAHAR'
      ? ['Class 30 (Dietetic food, herbal infusions)', 'Class 5 (Pharmaceutical/dietetic adapted for medical use)']
      : ['Class 5 (Ayurvedic & Pharmaceutical preparations)'];

    const trademarkGuidance = isDescriptive
      ? 'Warning: The proposed mark contains generic or descriptive Sanskrit botanical terms. Section 9(1)(b) of the Trade Marks Act prohibits registration of descriptive marks unless combined with a distinctive, coined arbitrary prefix or logo device.'
      : 'The proposed mark appears distinctive. Conduct a comprehensive phonetical and identical search on the IP India Trade Marks Registry Class 5/3 before filing.';

    // 5. GI Module
    let giRelevance = 'Low / No Direct GI Conflict';
    let giGuidance = 'No geographic place-name indicators identified in formulation title. Standard branding permitted.';
    const descLower = product.description.toLowerCase();
    const nameLower = product.name.toLowerCase();
    const allText = `${descLower} ${nameLower} ${product.ingredients.map(i => i.sanskritName.toLowerCase()).join(' ')}`;
    if (product.stateJurisdiction === 'Kerala' || allText.includes('malabar') || allText.includes('navara')) {
      giRelevance = 'Potential GI Overlap Identified';
      giGuidance = 'Verify compliance with registered GIs such as Navara Rice (GI #115), Malabar Pepper (GI #49), or Alleppey Green Cardamom (GI #65). Uncertified commercial use of GI names is prohibited under Section 8/11 of GI Act 1999.';
    } else if (allText.includes('kashmir') || allText.includes('kesar') || allText.includes('saffron')) {
      giRelevance = 'Potential GI Overlap Identified';
      giGuidance = 'Kashmir Saffron (GI #635) is a registered GI. Use of "Kashmir" or "Kashmiri" in product naming/marketing requires verified sourcing from the GI-designated territory. Uncertified use is prohibited under GI Act 1999.';
    } else if (allText.includes('darjeeling') || allText.includes('assam')) {
      giRelevance = 'Potential GI Overlap Identified';
      giGuidance = 'Darjeeling Tea (GI #1) and Assam Tea (GI #57) are strictly protected GIs. Any marketing using these geographic names requires authorized producer certification.';
    }

    // 6. ABS / Biological Resource Assessment
    const isCultivated = product.resourceSource === 'CULTIVATED';
    const isForeign = product.hasForeignEquity || product.applicantType === 'FOREIGN_ENTITY';
    const isMsme = product.applicantType === 'INDIAN_MSME';
    const isIndividualVaidya = product.applicantType === 'INDIVIDUAL';

    let absStatus: 'Prior NBA Approval Required' | 'SBB Intimation Required' | 'Exempted' | 'Requires Verification' = 'SBB Intimation Required';
    let absReason = '';
    const formsRequired: string[] = [];
    const absAuthority = isForeign ? 'National Biodiversity Authority (NBA), Chennai' : 'State Biodiversity Board (SBB)';

    if (isForeign) {
      absStatus = 'Prior NBA Approval Required';
      absReason = 'Applicant has foreign equity / foreign management. Under Section 3 of the Biological Diversity Act, prior approval of the NBA in Form 1 is mandatory before accessing Indian biological resources.';
      formsRequired.push('Form 1 (Access to Biological Resources)', 'Form 3 (Approval for applying for IPR inside/outside India)');
    } else if (isIndividualVaidya && product.classification === 'CLASSICAL_GENERIC') {
      absStatus = 'Exempted';
      absReason = 'Registered traditional AYUSH practitioners (Vaidyas) dispensing medicine to patients are specifically exempted under Section 7 Proviso of the 2023 Biodiversity Amendment Act.';
    } else if (isCultivated) {
      absStatus = 'SBB Intimation Required';
      absReason = 'Cultivated biological resources enjoy streamlined benefit-sharing under 2024 BDA Rules upon submitting valid cultivator origin certificates to the State Biodiversity Board.';
      formsRequired.push('Form A (Intimation to SBB with Cultivation Certificate)');
      if (jurisdiction === 'INDIA') formsRequired.push('Form 3 (NBA approval before Patent grant under Section 6)');
    } else {
      absStatus = 'SBB Intimation Required';
      absReason = 'Commercial utilization of biological resources obtained from India by Indian entities requires prior intimation to the concerned State Biodiversity Board under Section 7 of the BDA.';
      formsRequired.push('Intimation Form to State Biodiversity Board', 'Form 3 (NBA Approval for IPR filing under Section 6)');
    }

    // 7. Regulatory Pathway
    let regulatoryFramework = '';
    const documentation: string[] = [];
    const safetyTesting: string[] = [];
    const labelling: string[] = [];
    const advertising: string[] = [];
    let licensingAuthority = 'State Licensing Authority (Ayush)';
    let licensingPathway = '';

    if (product.classification === 'CLASSICAL_GENERIC') {
      regulatoryFramework = 'Drugs and Cosmetics Act 1940 & Rules 1945 (Rule 158-B(I))';
      licensingPathway = 'Form 25D (License to manufacture Ayurvedic/Siddha/Unani drugs) from State Ayush Drug Controller.';
      documentation.push('Literature reference from First Schedule authoritative texts (e.g. Bhaishajya Ratnavali, AFI, API)');
      documentation.push('Batch Manufacturing Record (BMR) compliant with Schedule T (Good Manufacturing Practices)');
      safetyTesting.push('Heavy metals analysis (Lead, Cadmium, Mercury, Arsenic within AYUSH limits)');
      safetyTesting.push('Microbial load testing and pesticide residue clearance');
      labelling.push('Label must clearly display classical text reference, classical yoga name, batch number, and Schedule T GMP license');
      advertising.push('Must not make direct disease cure claims prohibited under Drugs and Magic Remedies Act 1954 (54 scheduled diseases)');
    } else if (product.classification === 'PATENT_PROPRIETARY') {
      regulatoryFramework = 'Drugs and Cosmetics Act 1940 (Section 3(h)) & Rule 158-B(II)';
      licensingPathway = 'Form 25D for Patent/Proprietary ASU medicine with State Ayush Licensing Authority.';
      documentation.push('Proof that all individual botanical ingredients are listed in First Schedule authoritative texts');
      documentation.push('Standard Operating Procedures (SOP) for proprietary extraction ratio and concentration');
      safetyTesting.push('Acute oral toxicity study as per OECD Guidelines 423/420 conducted in a GLP-certified facility');
      safetyTesting.push('Stability testing data (accelerated at 40°C/75% RH for 6 months and real-time at 30°C/65% RH)');
      safetyTesting.push('Heavy metal limits, aflatoxins, and microbial assay');
      labelling.push('Must prominently state "Ayurvedic Proprietary Medicine", complete quantitative formula, and dosage');
      advertising.push('Scrutiny under Section 3 of Drugs and Magic Remedies Act: Joint disorder products cannot claim to "cure" or "reverse" arthritis; only functional comfort & mobility claims permitted.');
    } else if (product.classification === 'AYURVEDA_AAHAR') {
      regulatoryFramework = 'Food Safety and Standards (Ayurveda Aahar) Regulations, 2022 (FSSAI)';
      licensingAuthority = 'Food Safety and Standards Authority of India (FSSAI) Central/State Licensing';
      licensingPathway = 'FSSAI License under Ayurveda Aahar Category (Food Category 13/14).';
      documentation.push('Compliance declaration with Schedule I & II of FSSAI Ayurveda Aahar Regulations');
      documentation.push('Safety certificate and authentic traditional dietary rationale');
      safetyTesting.push('Food safety contaminants testing (heavy metals, mycotoxins, pesticide residues)');
      labelling.push('Mandatory Ayurveda Aahar official logo with green leaf motif');
      labelling.push('Advisory statement: "FOR GENERAL HEALTH AND WELL-BEING ONLY. NOT FOR MEDICINAL USE."');
      advertising.push('ABSOLUTE PROHIBITION on therapeutic disease claims. Any claim of curing arthritis, diabetes, or obesity revokes the food license immediately.');
    } else if (product.classification === 'PHYTOPHARMACEUTICAL') {
      regulatoryFramework = 'Drugs and Cosmetics Rules 1945, Rule 122-E & Schedule Y (CDSCO)';
      licensingAuthority = 'Central Drugs Standard Control Organization (CDSCO) / DCGI';
      licensingPathway = 'New Drug Approval from DCGI followed by manufacturing license from State Licensing Authority.';
      documentation.push('Standardized chromatographic fingerprint (HPLC/HPTLC/LC-MS) with minimum 4 chemical markers');
      documentation.push('Preclinical safety dossier including sub-acute and chronic toxicity (90-day animal data)');
      safetyTesting.push('Phase I, Phase II dose-finding, and Phase III multicentric clinical trials');
      labelling.push('Prescription drug labelling with storage, contraindications, and active biomarker assay');
      advertising.push('Prescription only — direct-to-consumer advertising prohibited under DMR Act.');
    } else {
      regulatoryFramework = 'Cosmetics Rules, 2020 / ASU Cosmetic Guidelines';
      licensingPathway = 'Form 32 (Cosmetics Manufacturing License) or ASU Cosmetic endorsement.';
      documentation.push('Safety assessment of topical ingredients and heavy metals');
      safetyTesting.push('Dermal irritation & sensitization test (OECD 404)');
      labelling.push('Cosmetic labelling: "For external use only", full ingredient listing (INCI / Sanskrit names)');
      advertising.push('Cosmetic claims limited to beautification and skin cleansing.');
    }

    // 8. International Export Module
    const exportRoute = jurisdiction === 'INTERNATIONAL' ? {
      targetMarket: product.targetExportMarket || 'USA',
      treatiesApplicable: [
        'WIPO GRATK Treaty (2024) - Mandatory Genetic Resources & TK Disclosure',
        'Nagoya Protocol on Access and Benefit-Sharing (IRCC verification)',
        'WTO TRIPS Agreement (Articles 27.1 and 27.3(b))'
      ],
      marketAccessFramework: product.targetExportMarket === 'EU'
        ? 'EU Directive 2004/24/EC (THMPD) & Directive 2001/83/EC'
        : 'US FDA Dietary Supplement Health and Education Act (DSHEA 1994) & 21 CFR Part 190 (NDI)',
      traditionalUseRequirement: product.targetExportMarket === 'EU'
        ? 'Requires 30 years of traditional medicinal use, including at least 15 years documented within the EU. Classical Indian documentation alone cannot satisfy the simplified THMPD route without EU market history.'
        : 'Herbal extracts not marketed in the US before Oct 15, 1994 require a 75-day New Dietary Ingredient (NDI) safety notification to US FDA.',
      wipoGratkDisclosure: 'Mandatory disclosure required in all national patent filings designating India as country of origin for biological resources.',
      recommendations: [
        'For US Entry: Market as Dietary Supplement with Structure/Function claims and mandatory FDA DSHEA disclaimer ("These statements have not been evaluated by the FDA...").',
        'For EU Entry: If lacking 15-year EU commercial usage, pursue Food Supplement route through national mutual recognition (e.g. Germany/France/Italy botanical lists) rather than medicinal THMPD.',
        'Obtain Certificate of Free Sale (CoFS) from Ministry of Ayush / CDSCO before export clearance.'
      ]
    } : undefined;

    // 9. Recommended Next Steps (Assessment-Driven Roadmap)
    const recommendedNextSteps = [
      {
        stage: 'Stage 1: Traditional Knowledge & Prior Art Clearance',
        title: 'TKDL & Patent Database Clearance Search',
        description: 'Perform a comprehensive prior-art search across the Indian Patent Advanced Search System (InPASS), TKDL, and WIPO PATENTSCOPE to map existing citations for ' + product.ingredients.map(i => i.sanskritName).join(', ') + '.',
        priority: 'HIGH' as const
      },
      {
        stage: 'Stage 2: Biological Resource & ABS Formalities',
        title: 'File Intimation / Permission with ' + absAuthority,
        description: isCultivated
          ? 'Secure Cultivator Origin Certificate to claim simplified benefit-sharing with SBB; prepare Form 3 for NBA if patent filing is planned.'
          : 'Initiate Access & Benefit Sharing (ABS) compliance with NBA/SBB to avoid punitive seizure under amended Section 55 of Biological Diversity Act.',
        priority: 'HIGH' as const
      },
      {
        stage: 'Stage 3: Regulatory Dossier & Labelling Compliance',
        title: 'Prepare Rule 158-B Licensing Dossier',
        description: 'Complete acute oral toxicity testing (OECD 423) and heavy metals testing at a NABL/GLP accredited laboratory; draft product carton strictly adhering to DMR Act advertising boundaries.',
        priority: 'MEDIUM' as const
      },
      {
        stage: 'Stage 4: Intellectual Property Execution',
        title: product.hasNovelProcess ? 'Draft Process Patent Application' : 'Trademark Registration in Class 5/3',
        description: product.hasNovelProcess
          ? 'Prepare provisional patent specification focusing on novel extraction parameters and synergistic bioassay data to satisfy Section 3(e).'
          : 'File coined trademark application on IP India e-filing portal to secure brand equity without using descriptive Sanskrit terms.',
        priority: 'MEDIUM' as const
      }
    ];

    // Note: humanReviewFlags for Vacha β-asarone and Bhasma heavy metals are added above in the prior art section
    if (classicalCheck.isMatch) humanReviewFlags.push('Classical Yoga Match: Patent application faces statutory rejection under Section 3(p). Professional IP attorney review recommended.');
    if (isForeign) humanReviewFlags.push('Foreign Equity Detected: Mandatory Form 1 NBA approval required before commercial utilization.');

    // DMR Act 1954 — Expanded Scheduled Disease Scrutiny (54 conditions)
    const dmrScheduledTerms = [
      'cure', 'arthritis', 'diabetes', 'cancer', 'tumour', 'tumor', 'hypertension',
      'blood pressure', 'sexual', 'impotence', 'erectile', 'fertility', 'kidney',
      'renal', 'asthma', 'obesity', 'weight loss', 'liver disease', 'hepatitis',
      'heart disease', 'cardiac failure', 'epilepsy', 'paralysis', 'leprosy',
      'tuberculosis', 'blindness', 'cataract', 'deafness', 'insanity', 'leucoderma',
      'baldness', 'greying hair', 'menstrual disorder', 'hydrocele', 'piles',
      'fistula', 'stammer', 'change of sex', 'premature ageing'
    ];
    const claimsText = product.healthClaims.map(c => c.toLowerCase()).join(' ');
    const matchedDmrTerms = dmrScheduledTerms.filter(term => claimsText.includes(term));
    if (matchedDmrTerms.length > 0) {
      humanReviewFlags.push(`DMR Act 1954 Scrutiny: Health claims reference scheduled disease terms (${matchedDmrTerms.join(', ')}). Direct curative/treatment claims for these conditions carry criminal liability under Section 3 of the DMR Act. Modify to functional wellness claims only.`);
    }

    // CITES-listed species warning
    if (hasJatamansi || hasKatuki) {
      humanReviewFlags.push('CITES Appendix II ALERT: Formulation contains CITES-listed species (Nardostachys jatamansi / Picrorhiza kurroa). International trade requires CITES export permits from the Wildlife Crime Control Bureau (WCCB). Sustainable sourcing certification and chain-of-custody documentation mandatory.');
    }

    const aiReasoning = jurisdiction === 'INDIA'
      ? `Under the Indian statutory framework, ${product.name} is categorized as a ${product.classification.replace(/_/g, ' ')}. Because its botanical ingredients (${product.ingredients.map(i => i.sanskritName).join(', ')}) have extensive classical citations in First Schedule authoritative texts and the TKDL, product patent claims will encounter absolute rejection under Section 3(p) and Section 3(e) unless clear, non-obvious synergistic efficacy is proven with quantitative bioassays. However, the proprietary processing technique qualifies for process patent protection. For regulatory licensing under Drugs & Cosmetics Rule 158-B(II), acute toxicity and heavy metal validation are required. Furthermore, biological resource utilization triggers the Biological Diversity Act, necessitating State Biodiversity Board intimation and NBA Form 3 clearance prior to any patent grant.`
      : `Under International treaties and export market regulations, ${product.name} is subject to the newly adopted WIPO GRATK Treaty (2024), which mandates the disclosure of India as the country of origin in all global patent applications. For market entry into the United States, commercialization as a Dietary Supplement under DSHEA 1994 is the primary viable route, requiring strict adherence to Structure/Function claims and potential NDI notification for non-pre-1994 extracts. For the European Union, the simplified THMPD Directive requires 15 years of prior European clinical use, making the national Food Supplement route more accessible than medicinal licensing.`;

    return {
      id: 'asmt-' + Math.random().toString(36).substring(2, 9),
      productId: product.id,
      productName: product.name,
      jurisdiction,
      classification: product.classification,
      patentRoute: {
        status: patentStatus,
        novelty,
        inventiveStep,
        traditionalKnowledgeFlag: classicalCheck.isTraditionalKnowledge,
        priorArtMatches,
        exclusionsApplicable: exclusions,
        recommendations: patentRecs
      },
      trademarkRoute: {
        status: 'Trademark Class Evaluation Complete',
        classes: trademarkClasses,
        genericNameConflict: isDescriptive,
        sanskritDescriptiveBar: isDescriptive,
        guidance: trademarkGuidance
      },
      giRoute: {
        relevance: giRelevance,
        guidance: giGuidance
      },
      designCopyrightRoute: {
        designProtection: 'Unique packaging bottles, blister geometries, and specialized applicators can be protected under the Designs Act 2000 (10-year renewable term).',
        copyrightProtection: 'Original label artistic artwork, packaging illustrations, and educational patient brochures receive automatic copyright protection under the Copyright Act 1957.'
      },
      absRoute: {
        resourceDetected: true,
        sourceIdentified: true,
        commercialActivity: true,
        ipActivity: true,
        absStatus,
        formsRequired,
        reason: absReason,
        authority: absAuthority
      },
      regulatoryPathway: {
        framework: regulatoryFramework,
        documentationRequired: documentation,
        safetyTestingRequired: safetyTesting,
        labellingMandates: labelling,
        advertisingScrutiny: advertising,
        licensingAuthority,
        licensingPathway
      },
      internationalExportRoute: exportRoute,
      evidenceLevel: (searchResult.evidence.length >= 3 && !product.description.toLowerCase().includes('synthetic') && product.classification !== 'UNCERTAIN') ? 'HIGH' : (searchResult.evidence.length > 0 && !product.description.toLowerCase().includes('synthetic') && product.classification !== 'UNCERTAIN') ? 'MEDIUM' : 'INSUFFICIENT',
      confidence: (searchResult.isAbstentionTriggered || product.classification === 'UNCERTAIN' || product.description.toLowerCase().includes('synthetic')) ? 'INSUFFICIENT EVIDENCE' : 'MEDIUM CONFIDENCE',
      safeAbstention: searchResult.isAbstentionTriggered || product.classification === 'UNCERTAIN' || product.description.toLowerCase().includes('synthetic'),
      abstentionReason: (product.classification === 'UNCERTAIN' || product.description.toLowerCase().includes('synthetic'))
        ? 'Product involves purely synthetic pharmaceutical molecules or non-botanical substances that fall outside the statutory remit of the Ministry of Ayush and traditional Indian medicine frameworks. Safe AI Abstention is triggered.'
        : searchResult.abstentionReason,
      sourcesSearched: searchResult.totalSearched,
      relevantEvidenceCount: searchResult.relevantCount,
      evidence: searchResult.evidence,
      citations: searchResult.citations,
      aiReasoning,
      recommendedNextSteps,
      humanReviewFlags,
      disclaimer: 'Information and decision-support only. This system does not replace qualified legal or regulatory advice.',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Product Classifier
   * Understands intake attributes and maps to official categories with clear statutory rationale.
   */
  public classifyProduct(product: Partial<Product>): {
    classification: ProductClassification;
    rationale: string;
    suggestedQuestions: string[];
  } {
    const isClassical = Boolean(product.isClassicalTextBased);
    const hasNovelProcess = Boolean(product.hasNovelProcess);
    const intendedUse = (product.intendedUse || '').toLowerCase();
    const claims = (product.healthClaims || []).join(' ').toLowerCase();
    const dosage = product.dosageForm || '';

    // Check if cosmetics
    if (dosage === 'CREAM_OINTMENT' && (intendedUse.includes('skin radiance') || intendedUse.includes('hair care') || intendedUse.includes('beauty'))) {
      return {
        classification: 'COSMETIC',
        rationale: 'Topical application intended primarily for cleansing, beautification, or altering appearance without medicinal disease-cure claims falls under Ayurvedic Cosmetics.',
        suggestedQuestions: ['Are any dermatological or therapeutic claims made (e.g. treating eczema or psoriasis)?', 'Is the product intended solely for external beauty application?']
      };
    }

    // Check if food / nutraceutical
    if (dosage === 'AAHAR_BAR' || intendedUse.includes('daily nutrition') || claims.includes('nutritional') || intendedUse.includes('dietary')) {
      return {
        classification: 'AYURVEDA_AAHAR',
        rationale: 'Formulation prepared as an ingestible food or dietary supplement for maintaining physiological well-being under FSSAI Ayurveda Aahar Regulations 2022. No disease-cure claims permitted.',
        suggestedQuestions: ['Are you claiming to treat, cure, or mitigate any disease?', 'Are all ingredients listed in Schedule I or II of FSSAI Ayurveda Aahar Regulations?']
      };
    }

    // Classical Generic Medicine
    if (isClassical) {
      return {
        classification: 'CLASSICAL_GENERIC',
        rationale: 'Formulation, dosage, and indication are verbatim from First Schedule classical texts (e.g. Charaka, Sushruta, Bhaishajya Ratnavali). Falls under Section 3(a) of Drugs & Cosmetics Act and subject to Section 3(p) patent bar.',
        suggestedQuestions: ['Which specific First Schedule classical text and shloka is the formulation cited from?', 'Has any ingredient, ratio, or traditional method of preparation been altered?']
      };
    }

    // Patent & Proprietary ASU Medicine
    if (!isClassical && (intendedUse.includes('joint') || intendedUse.includes('arthritis') || intendedUse.includes('inflammatory') || intendedUse.includes('stress') || intendedUse.includes('metabolic'))) {
      return {
        classification: 'PATENT_PROPRIETARY',
        rationale: 'Ingredients exist in First Schedule authoritative Ayurvedic texts, but the specific combination, extraction technique, or ratio is proprietary. Governed under Section 3(h) of Drugs & Cosmetics Act.',
        suggestedQuestions: ['Do you have experimental bioassay data demonstrating synergistic activity beyond additive effect (Section 3(e))?', 'Is the formulation prescribed for an established traditional indication or a novel therapeutic indication?']
      };
    }

    // New Non-Classical Drug
    if (hasNovelProcess && (claims.includes('novel bioactive') || claims.includes('purified molecule'))) {
      return {
        classification: 'PHYTOPHARMACEUTICAL',
        rationale: 'Purified and standardized plant fraction with minimum 4 chemical biomarkers requiring DCGI approval under Rule 122-E of Drugs and Cosmetics Rules.',
        suggestedQuestions: ['Have minimum 4 bioactive chemical markers been quantitatively identified and fingerprinted?', 'Are preclinical animal toxicology studies completed?']
      };
    }

    // Uncertain
    return {
      classification: 'UNCERTAIN',
      rationale: 'Classification uncertain — additional clarifying information required regarding formulation origins, therapeutic claims, and processing methods.',
      suggestedQuestions: [
        'Is the formulation verbatim from an authoritative classical text in the First Schedule?',
        'Are explicit therapeutic disease treatment claims made?',
        'Is the product intended as a daily wellness food, cosmetic, or therapeutic drug?'
      ]
    };
  }
}

export const ragEngine = new RAGEngine();
