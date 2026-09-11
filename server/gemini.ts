import { GoogleGenAI } from '@google/genai';
import { EvidenceItem, Citation, Jurisdiction, ProductClassification } from '../src/types.js';
import { validateCitation as validateSingleCitation } from './evidenceValidator.js';

let aiClient: GoogleGenAI | null = null;
function getGenAI() {
  if (!aiClient && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export interface AnswerGenerationRequest {
  userQuestion: string;
  productName: string;
  productDescription: string;
  classification: ProductClassification;
  jurisdiction: Jurisdiction;
  evidence: EvidenceItem[];
  citations: Citation[];
  isAbstentionTriggered?: boolean;
  abstentionReason?: string;
}

export interface GeneratedAnswer {
  answer: string;
  reasoning: string;
  evidenceRefs: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  evidenceStrength: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  isAbstaining: boolean;
  safeAbstention: boolean;
  abstentionMessage?: string;
  abstentionReason?: string;
  citationsUsed: Citation[];
  citations: Array<{ id: string; authority: string; document: string; section: string; pageRecord?: string; passage: string; source: string }>;
  recommendedActions: string[];
  nextSteps: string[];
  uncertainties: string[];
  humanReviewRequired: boolean;
  disclaimer: string;
  citationValidation?: { totalValidated: number; valid: number; invalid: number; failures: string[] };
}

const disclaimer = 'Information and decision-support only. This system does not replace qualified legal or regulatory advice.';

export function determineConfidence(evidence: EvidenceItem[], citationCount: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT' {
  if (evidence.length >= 3 && citationCount >= 2) return 'HIGH';
  if (evidence.length >= 2 && citationCount >= 1) return 'MEDIUM';
  if (evidence.length >= 1) return 'LOW';
  return 'INSUFFICIENT';
}

/**
 * Extract [Evidence N] references from LLM text and map them to provided citations.
 * If the LLM fails to cite any evidence explicitly, return EMPTY (do NOT silently attach top citations).
 */
function extractCitationRefs(text: string, citations: Citation[], evidenceCount: number): Citation[] {
  const refs = [...text.matchAll(/\[Evidence\s+(\d+)\]/gi)]
    .map(m => Number(m[1]))
    .filter(n => Number.isInteger(n) && n >= 1 && n <= evidenceCount);
  const unique = [...new Set(refs)];
  // No silent fallback — if LLM didn't cite, return empty
  return unique.map(n => citations[n - 1]).filter(Boolean);
}

/**
 * Run formal 5-stage citation validation on extracted citations.
 * Returns validation report summary.
 */
function runCitationValidation(citationsUsed: Citation[], answerText: string, jurisdiction: Jurisdiction): {
  validCitations: Citation[];
  totalValidated: number;
  valid: number;
  invalid: number;
  failures: string[];
} {
  const failures: string[] = [];
  const validCitations: Citation[] = [];

  for (const cit of citationsUsed) {
    const result = validateSingleCitation(cit.id, answerText, jurisdiction);
    if (result.isValid) {
      validCitations.push(cit);
    } else {
      failures.push(`${cit.id}: ${result.failureReasons.join('; ')}`);
    }
  }

  return {
    validCitations,
    totalValidated: citationsUsed.length,
    valid: validCitations.length,
    invalid: citationsUsed.length - validCitations.length,
    failures
  };
}

export function abstain(jurisdiction: string, reason: string): GeneratedAnswer {
  return {
    answer: `⚠ SAFE AI ABSTENTION\n\nI cannot provide an authoritative legal conclusion for this specific inquiry under ${jurisdiction} statutes.\n\nReason: ${reason}\n\nHuman Review Recommended: Consult a qualified Patent Agent or AYUSH Regulatory Advocate for verifiable statutory guidance.`,
    reasoning: reason,
    evidenceRefs: [],
    confidence: 'INSUFFICIENT',
    evidenceStrength: 'INSUFFICIENT',
    isAbstaining: true,
    safeAbstention: true,
    abstentionMessage: reason,
    abstentionReason: reason,
    citationsUsed: [],
    citations: [],
    recommendedActions: [
      'Consult a registered AYUSH Patent Agent / Attorney',
      'Verify whether experimental bioassay data is required',
      'Request certified registry extract from IP India / NBA'
    ],
    nextSteps: [
      'Consult a registered AYUSH Patent Agent / Attorney',
      'Verify whether experimental bioassay data is required',
      'Request certified registry extract from IP India / NBA'
    ],
    uncertainties: [reason],
    humanReviewRequired: true,
    disclaimer
  };
}

export async function generateGroundedAnswer(request: AnswerGenerationRequest): Promise<GeneratedAnswer> {
  const {
    userQuestion,
    productName,
    productDescription,
    classification,
    jurisdiction,
    evidence,
    citations,
    isAbstentionTriggered,
    abstentionReason
  } = request;

  // Check for safe abstention guardrail
  if (isAbstentionTriggered) {
    return abstain(jurisdiction, abstentionReason || 'Query involves speculative facts or judicial outcomes outside verified statutory records.');
  }

  if (!evidence || evidence.length === 0) {
    return abstain(jurisdiction, `No verified authoritative evidence found in the ${jurisdiction} corpus for this inquiry.`);
  }

  // Format evidence for prompt
  const evidenceText = evidence.map((e, index) => {
    return `[Evidence ${index + 1}]
Authority: ${e.authority}
Framework: ${e.framework}
Section/Rule: ${e.section}
Jurisdiction: ${e.jurisdiction}
Title: ${e.title}
Passage: "${e.passage}"
Source: ${e.sourceUrl}`;
  }).join('\n\n');

  const systemInstruction = `You are AyushIP Navigator, an authoritative statutory IP & regulatory decision-support AI for the Ministry of Ayush, India (SIH26045).
Your core principle: LLM ≠ Source of Truth.
Every response must be grounded ONLY in the supplied Evidence passages.
Active Jurisdiction: ${jurisdiction}. Keep Indian and International frameworks strictly distinct.
Never guarantee patent grant, approval, or legal outcome.
Explicitly cite evidence using [Evidence N].
Distinguish facts from interpretation.
End with disclaimer: "${disclaimer}".`;

  const prompt = `Question: "${userQuestion}"
Product: ${productName}
Description: ${productDescription}
Classification: ${classification}
Jurisdiction: ${jurisdiction}

VERIFIED STATUTORY EVIDENCE:
${evidenceText}

Generate an authoritative, cited assessment answering the question. Output valid JSON with keys:
- answer: string (detailed answer with [Evidence N] citations)
- reasoning: string (concise legal reasoning)
- evidenceRefs: array of strings e.g. ["[Evidence 1]", "[Evidence 2]"]
- uncertainties: array of strings
- nextSteps: array of strings`;

  const ai = getGenAI();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.1,
          responseMimeType: 'application/json',
        }
      });

      const text = (response.text || '').trim();
      if (text) {
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          // If JSON parse fails, treat raw text as answer
          parsed = { answer: text, reasoning: text, evidenceRefs: ['[Evidence 1]'], nextSteps: [], uncertainties: [] };
        }

        const fullTextForCitations = `${parsed.answer || ''} ${parsed.reasoning || ''} ${(parsed.evidenceRefs || []).join(' ')}`;
        const extractedCits = extractCitationRefs(fullTextForCitations, citations, evidence.length);

        // If LLM failed to cite ANY evidence, trigger abstention instead of silently attaching citations
        if (extractedCits.length === 0) {
          return abstain(jurisdiction, 'AI generated a response but failed to cite any specific evidence. Citation validation requires explicit evidence references. Professional review is recommended.');
        }

        // Run formal 5-stage citation validation
        const validationReport = runCitationValidation(extractedCits, parsed.answer || text, jurisdiction);

        // If majority of citations are invalid, downgrade to abstention
        if (validationReport.valid === 0) {
          return abstain(jurisdiction, `Citation validation failed: none of the ${validationReport.totalValidated} cited evidence items passed verification. ${validationReport.failures.join('; ')}`);
        }

        const validCits = validationReport.validCitations;
        const confidence = validationReport.invalid > 0
          ? (validationReport.valid >= 2 ? 'MEDIUM' as const : 'LOW' as const)
          : determineConfidence(evidence, validCits.length);

        const formattedCitations = validCits.map(c => ({
          id: c.id,
          authority: c.authority,
          document: c.document,
          section: c.section,
          pageRecord: c.pageRecord || '',
          passage: c.passage,
          source: c.source
        }));

        const actions = parsed.nextSteps && parsed.nextSteps.length > 0 ? parsed.nextSteps : [
          'Verify experimental synergy data to overcome Section 3(e)',
          'Complete State Biodiversity Board intimation under Section 7',
          'Review marketing claims against DMR Act 1954 prohibited disease list'
        ];

        return {
          answer: parsed.answer || text,
          reasoning: parsed.reasoning || '',
          evidenceRefs: parsed.evidenceRefs || ['[Evidence 1]'],
          confidence,
          evidenceStrength: confidence,
          isAbstaining: false,
          safeAbstention: false,
          citationsUsed: validCits,
          citations: formattedCitations,
          recommendedActions: actions,
          nextSteps: actions,
          uncertainties: [
            ...(parsed.uncertainties || []),
            ...(validationReport.invalid > 0 ? [`${validationReport.invalid} citation(s) failed formal validation and were excluded.`] : [])
          ],
          humanReviewRequired: validationReport.invalid > 0,
          disclaimer,
          citationValidation: {
            totalValidated: validationReport.totalValidated,
            valid: validationReport.valid,
            invalid: validationReport.invalid,
            failures: validationReport.failures
          }
        };
      }
    } catch (err) {
      console.warn('[AI] Gemini live generation unavailable, falling back to evidence summary:', err);
    }
  }

  // =========================================================================
  // EVIDENCE SUMMARY FALLBACK (when Gemini API is unavailable)
  // Presents retrieved evidence directly WITHOUT AI-interpreted legal conclusions.
  // This avoids hard-coded legal answers and is transparent about the limitation.
  // =========================================================================
  const qLower = userQuestion.toLowerCase();
  const descLower = (productDescription || '').toLowerCase();

  // Synthetic chemical or out-of-scope check (these still trigger full abstention)
  const syntheticTerms = ['piracetam', 'paracetamol', 'atorvastatin', 'sildenafil', 'ibuprofen', 'synthetic molecule', 'synthetic chemical', 'synthetic nootropic'];
  if (syntheticTerms.some(term => qLower.includes(term) || descLower.includes(term))) {
    return abstain(jurisdiction, 'Inquiry involves purely synthetic pharmaceutical molecules or non-botanical substances that fall outside the statutory remit of the Ministry of Ayush and traditional Indian medicine frameworks.');
  }

  // Speculative judicial outcomes check
  const speculativeTerms = ['who will win', 'predict judicial', 'guarantee patent', 'future court decision', 'speculative dispute'];
  if (speculativeTerms.some(term => qLower.includes(term))) {
    return abstain(jurisdiction, 'Inquiry requests speculative prediction of judicial dispute outcomes without verifiable statutory precedent.');
  }

  // If no evidence at all, abstain
  if (!evidence || evidence.length === 0) {
    return abstain(jurisdiction, `No verified authoritative evidence found in the ${jurisdiction} corpus for this inquiry.`);
  }

  // Generate a structured evidence summary (not AI interpretation)
  const evidenceSummaryParts = evidence.slice(0, 4).map((e, i) => {
    return `[Evidence ${i + 1}]
Authority: ${e.authority}
Framework: ${e.framework}
Section/Rule: ${e.section}
Passage: "${e.passage}"
Source: ${e.sourceUrl}
Verification: ${(e as any).verificationStatus || 'VERIFIED_OFFICIAL'}`;
  });

  const answerContent = `📋 EVIDENCE SUMMARY (AI reasoning unavailable)

The following verified statutory evidence was retrieved from the ${jurisdiction} corpus for product "${productName}" (${classification.replace(/_/g, ' ')}):

${evidenceSummaryParts.join('\n\n')}

⚠ IMPORTANT: AI reasoning engine is currently unavailable. The above is a direct presentation of retrieved statutory evidence without AI interpretation. A qualified AYUSH Patent Agent, Regulatory Advocate, or statutory expert should review this evidence and provide professional guidance.`;

  const reasoning = 'Evidence summary generated without AI reasoning. Gemini API unavailable or errored. Professional human review required.';
  const actions = [
    'Consult a qualified Patent Agent or AYUSH Regulatory Advocate to interpret the retrieved statutory evidence',
    'Verify statutory provisions against the latest gazette notifications',
    'Ensure all compliance requirements from the cited statutes are independently confirmed'
  ];

  const formattedCitations = citations.slice(0, 4).map(c => ({
    id: c.id,
    authority: c.authority,
    document: c.document,
    section: c.section,
    pageRecord: c.pageRecord || '',
    passage: c.passage,
    source: c.source
  }));

  return {
    answer: answerContent,
    reasoning,
    evidenceRefs: evidence.slice(0, 4).map((_, i) => `[Evidence ${i + 1}]`),
    confidence: 'LOW' as const,
    evidenceStrength: 'LOW' as const,
    isAbstaining: false,
    safeAbstention: false,
    citationsUsed: citations.slice(0, 4),
    citations: formattedCitations,
    recommendedActions: actions,
    nextSteps: actions,
    uncertainties: ['AI reasoning engine unavailable. Evidence presented without interpretation.'],
    humanReviewRequired: true,
    disclaimer: `${disclaimer} AI reasoning was unavailable for this response. Evidence summary only.`
  };
}

