export type Jurisdiction = 'INDIA' | 'INTERNATIONAL';

export type ProductClassification =
  | 'CLASSICAL_GENERIC'
  | 'PATENT_PROPRIETARY'
  | 'NEW_NON_CLASSICAL'
  | 'PHYTOPHARMACEUTICAL'
  | 'AYURVEDA_AAHAR'
  | 'COSMETIC'
  | 'UNCERTAIN';

export type ApplicantType =
  | 'INDIVIDUAL'
  | 'INDIAN_BUSINESS'
  | 'INDIAN_MSME'
  | 'FOREIGN_ENTITY'
  | 'NRI_ENTITY';

export type BiologicalResourceSource =
  | 'CULTIVATED'
  | 'WILD_HARVESTED'
  | 'IMPORTED'
  | 'TRADER_SUPPLIED';

export type DosageForm =
  | 'TAILA'
  | 'VATI'
  | 'CHURNA'
  | 'KWATHA'
  | 'ASAVA_ARISHTA'
  | 'CAPSULE'
  | 'CREAM_OINTMENT'
  | 'AAHAR_BAR'
  | 'SYRUP'
  | 'OTHER';

export interface Ingredient {
  sanskritName: string;
  commonName: string;
  botanicalName: string;
  plantPart: string;
  ratio: string;
  concentration?: string;
  extractionMethod: string;
  pharmacopoeiaRef?: string;
  traditionalRef?: string;
  isClassicalMatch?: boolean;
  tkdlFlag?: boolean;
  regionalNames?: string[];
  family?: string;
}

export interface Product {
  id: string;
  name: string;
  brandName?: string;
  description: string;
  intendedUse: string;
  healthClaims: string[];
  dosageForm: DosageForm | string;
  ingredients: Ingredient[];
  applicantType: ApplicantType;
  resourceSource: BiologicalResourceSource;
  stateJurisdiction: string;
  hasForeignEquity: boolean;
  hasNovelProcess: boolean;
  isClassicalTextBased: boolean;
  classicalTextReference?: string;
  classification: ProductClassification;
  classificationRationale: string;
  organization?: string;
  applicantName?: string;
  createdBy?: string;
  targetExportMarket?: 'USA' | 'EU' | 'UK' | 'UAE' | 'AUSTRALIA' | string;
  status: 'DRAFT' | 'CLASSIFIED' | 'ASSESSED' | 'PENDING_REVIEW' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface BotanicalEntity {
  id: string;
  sanskritName: string;
  hindiName: string;
  commonName: string;
  botanicalName: string;
  family: string;
  plantPartsUsed: string[];
  pharmacopoeiaRef: string;
  classicalYogas: string[];
  indications: string[];
  traditionalKnowledgeSummary: string;
  tkdlReference: string;
  famousRevocationCase?: string;
}

export interface ClassicalYoga {
  id: string;
  name: string;
  sanskritName: string;
  authoritativeText: string;
  chapterSection: string;
  primaryIngredients: string[];
  dosageForm: string;
  classicalIndication: string;
  isClassicalGeneric: boolean;
}

export type UserRole = 'VAIDYA' | 'STARTUP_MSME' | 'RESEARCHER' | 'IP_PROFESSIONAL' | 'ADMIN';

export interface EvidenceItem {
  id: string;
  authority: string;
  framework: string;
  section: string;
  jurisdiction?: Jurisdiction;
  title?: string;
  passage: string;
  strength?: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  sourceUrl: string;
  version?: string;
  effectiveDate?: string;
  tags?: string[];
  embeddingModel?: string;
  embedding?: number[];
  verificationStatus?: VerificationStatus;
  status?: 'CURRENT' | 'SUPERSEDED' | 'DRAFT' | 'UNKNOWN';
  page?: number | string;
  pageNumber?: number;
  pageRecord?: string;
  url?: string;
}

export interface Citation {
  id: string;
  authority: string;
  document: string;
  section: string;
  pageRecord?: string;
  source: string;
  passage: string;
}

export interface AssessmentResult {
  id: string;
  productId: string;
  productName: string;
  jurisdiction: Jurisdiction;
  classification: ProductClassification;
  patentRoute: {
    status: string;
    novelty: 'Requires detailed review' | 'Favorable' | 'Unlikely (Prior Art Exists)';
    inventiveStep: 'Requires detailed review' | 'Synergy Evidence Needed' | 'Favorable';
    traditionalKnowledgeFlag: boolean;
    priorArtMatches: string[];
    exclusionsApplicable: string[];
    recommendations: string[];
  };
  trademarkRoute: {
    status: string;
    classes: string[];
    genericNameConflict: boolean;
    sanskritDescriptiveBar: boolean;
    guidance: string;
  };
  giRoute: {
    relevance: string;
    applicableGI?: string;
    guidance: string;
  };
  designCopyrightRoute: {
    designProtection: string;
    copyrightProtection: string;
  };
  absRoute: {
    resourceDetected: boolean;
    sourceIdentified: boolean;
    commercialActivity: boolean;
    ipActivity: boolean;
    absStatus: 'Prior NBA Approval Required' | 'SBB Intimation Required' | 'Exempted' | 'Requires Verification';
    formsRequired: string[];
    reason: string;
    authority: string;
  };
  regulatoryPathway: {
    framework: string;
    documentationRequired: string[];
    safetyTestingRequired: string[];
    labellingMandates: string[];
    advertisingScrutiny: string[];
    licensingAuthority: string;
    licensingPathway: string;
  };
  internationalExportRoute?: {
    targetMarket: string;
    treatiesApplicable: string[];
    marketAccessFramework: string;
    traditionalUseRequirement: string;
    wipoGratkDisclosure: string;
    recommendations: string[];
  };
  tradeSecretRoute?: IPRouteResult;
  plantVarietyRoute?: IPRouteResult;
  tkPriorArtSummary?: string;
  classificationResult?: ClassificationResult;
  intentResult?: IntentResult;
  targetMarket?: TargetMarket;
  retrievalDiagnostics?: RetrievalDiagnostics;
  conflictReport?: ConflictReport;
  evidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  confidence: 'HIGH CONFIDENCE' | 'MEDIUM CONFIDENCE' | 'LOW CONFIDENCE' | 'INSUFFICIENT EVIDENCE';
  safeAbstention: boolean;
  abstentionReason?: string;
  sourcesSearched: number;
  relevantEvidenceCount: number;
  evidence: EvidenceItem[];
  citations: Citation[];
  aiReasoning: string;
  recommendedNextSteps: Array<{
    stage: string;
    title: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  humanReviewFlags: string[];
  disclaimer: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  jurisdiction: Jurisdiction;
  productId?: string;
  productName?: string;
  details: string;
  userEmail: string;
  userId?: string;
  requestId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'VAIDYA' | 'STARTUP_MSME' | 'RESEARCHER' | 'IP_PROFESSIONAL' | 'ADMIN';
  organization?: string;
  passwordHash?: string;
  state?: string;
  dpdpConsent?: boolean;
  bdaComplianceAck?: boolean;
  legalConsentDate?: string;
  registeredAt?: string;
  lastLoginAt?: string;
}

// ========================= ENHANCED TYPES =========================

export type TargetMarket = 'USA' | 'EU' | 'UK' | 'UAE' | 'AUSTRALIA' | 'OTHER';

export type VerificationStatus = 'VERIFIED_OFFICIAL' | 'CURATED_DEMO' | 'UNVERIFIED' | 'REVIEW_REQUIRED';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export type Intent =
  | 'PATENTABILITY' | 'NOVELTY_PRIOR_ART' | 'TRADITIONAL_KNOWLEDGE'
  | 'ABS_BIODIVERSITY' | 'TRADEMARK' | 'GI' | 'COPYRIGHT' | 'DESIGN'
  | 'TRADE_SECRET' | 'PLANT_VARIETY' | 'PRODUCT_CLASSIFICATION'
  | 'AYUSH_LICENSING' | 'SAFETY_TESTING' | 'LABELLING'
  | 'ADVERTISING_CLAIMS' | 'EXPORT_MARKET_ACCESS' | 'TREATY_OBLIGATIONS'
  | 'SOURCE_DOCUMENT_LOOKUP' | 'GENERAL_UNSUPPORTED';

export interface IntentResult {
  intent: Intent;
  confidence: number;
  secondaryIntents: Intent[];
  missingFacts: string[];
}

export interface ClassificationResult {
  classification: ProductClassification;
  reasons: string[];
  evidenceUsed: string[];
  missingFacts: string[];
  confidence: ConfidenceLevel;
  nextQuestions: string[];
}

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

export interface ConflictReport {
  hasConflict: boolean;
  conflicts: Array<{
    sourceA: { id: string; authority: string; section: string };
    sourceB: { id: string; authority: string; section: string };
    conflictType: string;
    resolution?: string;
    escalationNeeded: boolean;
  }>;
}

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
  sourceType: string;
  verificationStatus: VerificationStatus;
  retrievalTimestamp: string;
  contentHash: string;
  pageNumber?: number;
  textChunk: string;
}

export interface QuestionAnswer {
  questionId: string;
  answer: string;
  timestamp: string;
}

export interface AdaptiveQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  options: Array<{ value: string; label: string }>;
  allowUnknown: boolean;
}

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

export interface ReviewTask {
  id: string;
  type: 'EVIDENCE_REVIEW' | 'DOCUMENT_VERIFICATION' | 'ASSESSMENT_REVIEW' | 'CONFLICT_RESOLUTION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED';
  assignedRole: string;
  relatedEntityId: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

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
