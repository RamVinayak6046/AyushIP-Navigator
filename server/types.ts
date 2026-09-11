/**
 * AyushIP Navigator — Server-Side Type Definitions
 * Centralized types for all backend modules.
 * Frontend-shared types remain in ../src/types.ts
 */

import type { Jurisdiction, Product, EvidenceItem, ProductClassification } from '../src/types.js';

// ========================= ENUMS =========================

export type Intent =
  | 'PATENTABILITY'
  | 'NOVELTY_PRIOR_ART'
  | 'TRADITIONAL_KNOWLEDGE'
  | 'ABS_BIODIVERSITY'
  | 'TRADEMARK'
  | 'GI'
  | 'COPYRIGHT'
  | 'DESIGN'
  | 'TRADE_SECRET'
  | 'PLANT_VARIETY'
  | 'PRODUCT_CLASSIFICATION'
  | 'AYUSH_LICENSING'
  | 'SAFETY_TESTING'
  | 'LABELLING'
  | 'ADVERTISING_CLAIMS'
  | 'EXPORT_MARKET_ACCESS'
  | 'TREATY_OBLIGATIONS'
  | 'SOURCE_DOCUMENT_LOOKUP'
  | 'GENERAL_UNSUPPORTED';

export type TargetMarket = 'USA' | 'EU' | 'UK' | 'UAE' | 'AUSTRALIA' | 'OTHER';

export type VerificationStatus =
  | 'VERIFIED_OFFICIAL'
  | 'CURATED_DEMO'
  | 'UNVERIFIED'
  | 'REVIEW_REQUIRED';

export type UserRole = 'VAIDYA' | 'STARTUP_MSME' | 'RESEARCHER' | 'IP_PROFESSIONAL' | 'ADMIN';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

// ========================= INTENT CLASSIFIER =========================

export interface IntentResult {
  intent: Intent;
  confidence: number;
  secondaryIntents: Intent[];
  missingFacts: string[];
}

// ========================= JURISDICTION ROUTER =========================

export interface JurisdictionContext {
  jurisdiction: Jurisdiction;
  targetMarket?: TargetMarket;
  corpusFilter: (item: EvidenceItem) => boolean;
  treatyFrameworks: string[];
  description: string;
}

// ========================= ADAPTIVE QUESTIONS =========================

export interface QuestionOption {
  value: string;
  label: string;
  nextNodeId: string | null;
}

export interface QuestionNode {
  id: string;
  question: string;
  whyItMatters: string;
  options: QuestionOption[];
  allowUnknown: boolean;
  unknownNextNodeId: string | null;
  fieldToUpdate?: string;
}

export interface QuestionAnswer {
  questionId: string;
  answer: string;
  timestamp: string;
}

export interface AdaptiveQuestionResult {
  currentQuestion: QuestionNode | null;
  answeredQuestions: QuestionAnswer[];
  nextQuestionId: string | null;
  classificationHint?: ProductClassification;
  verificationNeeded: string[];
  isComplete: boolean;
}

// ========================= CLASSIFICATION =========================

export interface ClassificationResult {
  classification: ProductClassification;
  reasons: string[];
  evidenceUsed: string[];
  missingFacts: string[];
  confidence: ConfidenceLevel;
  nextQuestions: string[];
}

// ========================= BOTANICAL RESOLVER =========================

export interface BotanicalResolveResult {
  matches: Array<{
    id: string;
    sanskritName: string;
    commonName: string;
    botanicalName: string;
    family: string;
    confidence: number;
    matchType: 'exact' | 'alias' | 'fuzzy' | 'partial';
  }>;
  bestMatch: {
    id: string;
    sanskritName: string;
    commonName: string;
    botanicalName: string;
    family: string;
  } | null;
  confidence: number;
  conflictWarning?: string;
  evidenceLink?: string;
  plantPartValid?: boolean;
}

// ========================= CLASSICAL MATCHER =========================

export interface ClassicalMatch {
  yogaId: string;
  yogaName: string;
  sanskritName: string;
  authoritativeText: string;
  chapterSection: string;
  matchScore: number;
  matchType: 'exact_name' | 'exact_ingredients' | 'partial_ingredients' | 'indication';
  matchedIngredients: string[];
  unmatchedIngredients: string[];
  dosageFormMatch: boolean;
}

export interface ClassicalMatchResult {
  possibleMatches: ClassicalMatch[];
  exactMatch: boolean;
  partialMatches: ClassicalMatch[];
  unmatchedIngredients: string[];
  tkFlag: boolean;
  tkFlagReason?: string;
  evidenceItems: EvidenceItem[];
}

// ========================= IP ROUTE RESULTS =========================

export interface IPRouteResult {
  routeName: string;
  relevance: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_APPLICABLE';
  evidence: EvidenceItem[];
  risks: string[];
  unknowns: string[];
  nextSteps: string[];
  humanReviewTrigger: boolean;
  humanReviewReason?: string;
}

export interface PatentRouteResult extends IPRouteResult {
  noveltyAssessment: string;
  inventiveStepAssessment: string;
  priorArtMatches: string[];
  exclusionsApplicable: string[];
  productVsProcess: string;
  disclosureRequirements: string[];
  foreignFilingConsiderations: string[];
}

export interface TrademarkRouteResult extends IPRouteResult {
  niceClasses: string[];
  genericNameConflict: boolean;
  sanskritDescriptiveBar: boolean;
  registryDisclaimer: string;
}

export interface GIRouteResult extends IPRouteResult {
  applicableGIs: string[];
  geographicOverlap: boolean;
}

export interface CopyrightRouteResult extends IPRouteResult {
  protectableElements: string[];
}

export interface DesignRouteResult extends IPRouteResult {
  designElements: string[];
}

export interface TradeSecretRouteResult extends IPRouteResult {
  protectableProcesses: string[];
  ndaRecommendation: boolean;
}

export interface PlantVarietyRouteResult extends IPRouteResult {
  cultivarsIdentified: string[];
  ppvfrApplicable: boolean;
}

export interface CombinedIPRouteResult {
  patent: PatentRouteResult;
  trademark: TrademarkRouteResult;
  gi: GIRouteResult;
  copyright: CopyrightRouteResult;
  design: DesignRouteResult;
  tradeSecret: TradeSecretRouteResult;
  plantVariety: PlantVarietyRouteResult;
}

// ========================= TK / PRIOR ART =========================

export interface TKPriorArtResult {
  classicalReferences: Array<{
    source: string;
    text: string;
    chapter: string;
    relevance: number;
  }>;
  tkdlMatches: string[];
  evidenceItems: EvidenceItem[];
  jurisdiction: Jurisdiction;
  priorArtStrength: ConfidenceLevel;
  disclaimer: string;
}

// ========================= ABS MODULE =========================

export interface ABSAssessmentInput {
  biologicalResourcePresent: boolean;
  indianOrigin: boolean;
  resourceSource: string;
  applicantType: string;
  foreignParticipation: boolean;
  researchUse: boolean;
  commercialUse: boolean;
  ipActivity: boolean;
  intendedMarket: string;
}

export interface ABSAssessmentResult {
  reviewStatus: string;
  factualBasis: string[];
  authority: string;
  sourceEvidence: EvidenceItem[];
  formsRequired: string[];
  processSteps: string[];
  uncertaintyFlag: boolean;
  uncertaintyReason?: string;
  exemptionApplicable: boolean;
  exemptionReason?: string;
}

// ========================= REGULATORY ROUTER =========================

export interface RegulatoryRouteResult {
  pathway: string;
  framework: string;
  licensingAuthority: string;
  documentationRequired: string[];
  safetyTestingRequired: string[];
  labellingMandates: string[];
  advertisingScrutiny: string[];
  evidence: EvidenceItem[];
  uncertainties: string[];
}

// ========================= INTERNATIONAL MODULE =========================

export interface InternationalResult {
  targetMarket: TargetMarket;
  treatiesApplicable: string[];
  marketAccessFramework: string;
  traditionalUseRequirement: string;
  wipoGratkStatus: string;
  wipoGratkDisclosure: string;
  recommendations: string[];
  evidence: EvidenceItem[];
}

// ========================= EVIDENCE VALIDATION =========================

export interface CitationValidationResult {
  isValid: boolean;
  evidenceIdExists: boolean;
  jurisdictionMatch: boolean;
  passageSupported: boolean;
  sourceVerified: boolean;
  sourceVersionExists: boolean;
  passageInSnapshot: boolean;
  failureReasons: string[];
}

export interface EvidenceValidationReport {
  totalCitations: number;
  validCitations: number;
  invalidCitations: number;
  failures: Array<{
    citationId: string;
    reason: string;
  }>;
  overallValid: boolean;
}

// ========================= CONFLICT DETECTION =========================

export interface ConflictReport {
  hasConflict: boolean;
  conflicts: Array<{
    sourceA: { id: string; authority: string; section: string; effectiveDate: string; passage: string };
    sourceB: { id: string; authority: string; section: string; effectiveDate: string; passage: string };
    conflictType: 'DIFFERENT_REQUIREMENTS' | 'DIFFERENT_DATES' | 'SUPERSEDED' | 'DISAGREEMENT';
    resolution?: string;
    preferredSource?: string;
    escalationNeeded: boolean;
  }>;
}

// ========================= DOCUMENT METADATA =========================

export interface DocumentMetadata {
  documentId: string;
  title: string;
  authority: string;
  framework: string;
  jurisdiction: Jurisdiction;
  sectionArticleRule: string;
  publicationDate?: string;
  effectiveDate: string;
  version: string;
  status: 'CURRENT' | 'SUPERSEDED' | 'DRAFT' | 'UNKNOWN';
  sourceUrl: string;
  sourceType: 'OFFICIAL_GAZETTE' | 'GOVERNMENT_WEBSITE' | 'TREATY_BODY' | 'ACADEMIC' | 'OTHER';
  verificationStatus: VerificationStatus;
  retrievalTimestamp: string;
  contentHash: string;
  pageNumber?: number;
  textChunk: string;
}

// ========================= RETRIEVAL DIAGNOSTICS =========================

export interface RetrievalDiagnostics {
  totalSearched: number;
  candidateCount: number;
  topScores: number[];
  retrievalMethod: 'SPARSE' | 'SEMANTIC' | 'HYBRID_RRF' | 'SPARSE_FALLBACK';
  evidenceIds: string[];
  jurisdiction: Jurisdiction;
  verifiedSourceCount: number;
  staleSourceCount: number;
  unverifiedExcluded: number;
}

// ========================= LLM REASONING =========================

export interface LLMReasoningOutput {
  answer: string;
  reasoning: string;
  evidenceRefs: string[];
  confidence: ConfidenceLevel;
  evidenceStrength: ConfidenceLevel;
  uncertainties: string[];
  nextSteps: string[];
  humanReviewRequired: boolean;
  disclaimer: string;
}

// ========================= AUTH =========================

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  state?: string;
  dpdpConsent?: boolean;
  bdaComplianceAck?: boolean;
}

export interface AuthToken {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// ========================= API RESPONSE =========================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
}

// ========================= REVIEW TASKS =========================

export interface ReviewTask {
  id: string;
  type: 'EVIDENCE_REVIEW' | 'DOCUMENT_VERIFICATION' | 'ASSESSMENT_REVIEW' | 'CONFLICT_RESOLUTION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED';
  assignedRole: UserRole;
  relatedEntityId: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  completedBy?: string;
  resolution?: string;
}

// Re-export shared types for convenience
export type { Jurisdiction, Product, EvidenceItem, ProductClassification } from '../src/types.js';
