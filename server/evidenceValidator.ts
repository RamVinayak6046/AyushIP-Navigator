import { Jurisdiction, EvidenceItem } from '../src/types.js';
import { CitationValidationResult, EvidenceValidationReport } from './types.js';
import { AUTHORITATIVE_CORPUS } from './corpus.js';
import { knowledgeStore } from './knowledge.js';

/**
 * Validates a single citation against the authoritative corpus and knowledge store.
 */
export function validateCitation(citationId: string, claimText: string, answerJurisdiction: Jurisdiction): CitationValidationResult {
  const failureReasons: string[] = [];

  // Find evidence in corpus or knowledge store (handling possible 'cit-' prefix)
  const cleanId = citationId.replace(/^cit-/, '');
  let evidence = AUTHORITATIVE_CORPUS.find(e => e.id === citationId || e.id === cleanId);
  if (!evidence) {
    evidence = knowledgeStore.all().find(e => e.id === citationId || e.id === cleanId);
  }

  const evidenceIdExists = Boolean(evidence);
  if (!evidenceIdExists || !evidence) {
    failureReasons.push('Evidence not found in authoritative sources.');
    return {
      isValid: false,
      evidenceIdExists: false,
      jurisdictionMatch: false,
      passageSupported: false,
      sourceVerified: false,
      sourceVersionExists: false,
      passageInSnapshot: false,
      failureReasons
    };
  }

  // Check jurisdiction matches
  const jurisdictionMatch = evidence.jurisdiction === answerJurisdiction;
  if (!jurisdictionMatch) {
    failureReasons.push(`Jurisdiction mismatch. Expected ${answerJurisdiction}, found ${evidence.jurisdiction}.`);
  }

  // Check source verification status (check property or tag)
  const isUnverified = evidence.verificationStatus === 'UNVERIFIED' || (evidence.tags && evidence.tags.includes('UNVERIFIED'));
  const sourceVerified = !isUnverified;
  if (!sourceVerified) {
    failureReasons.push('Unverified sources are not allowed for authoritative answers.');
  }

  // Check source version field is populated
  const sourceVersionExists = Boolean(evidence.version && evidence.version.trim().length > 0);
  if (!sourceVersionExists) {
    failureReasons.push('Source version is missing.');
  }

  // Check claim is supported by passage (keyword overlap)
  const claimWords = claimText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const passage = (evidence.passage || '').toLowerCase();
  
  let matchCount = 0;
  for (const word of claimWords) {
    if (passage.includes(word)) {
      matchCount++;
    }
  }

  const passageSupported = claimWords.length < 2 || matchCount >= 1;
  if (!passageSupported) {
    failureReasons.push('Claim is not adequately supported by the evidence passage.');
  }

  const passageInSnapshot = Boolean(evidence.passage && evidence.passage.length > 0);
  const isValid = evidenceIdExists && jurisdictionMatch && sourceVerified && sourceVersionExists && passageSupported;

  return {
    isValid,
    evidenceIdExists,
    jurisdictionMatch,
    passageSupported,
    sourceVerified,
    sourceVersionExists,
    passageInSnapshot,
    failureReasons
  };
}

/**
 * Validates multiple citations and aggregates the results.
 */
export function validateAllCitations(citations: Array<{id: string, claim: string}>, jurisdiction: Jurisdiction): EvidenceValidationReport {
  const failures: Array<{ citationId: string; reason: string }> = [];
  let validCount = 0;

  for (const c of citations) {
    const res = validateCitation(c.id, c.claim, jurisdiction);
    if (res.isValid) {
      validCount++;
    } else {
      failures.push({
        citationId: c.id,
        reason: res.failureReasons.join('; ')
      });
    }
  }

  return {
    totalCitations: citations.length,
    validCitations: validCount,
    invalidCitations: failures.length,
    failures,
    overallValid: failures.length === 0
  };
}

/**
 * Retrieves verified evidence for a given jurisdiction.
 */
export function getVerifiedEvidence(jurisdiction: Jurisdiction): EvidenceItem[] {
  return AUTHORITATIVE_CORPUS.filter(e => 
    e.jurisdiction === jurisdiction &&
    e.verificationStatus !== 'UNVERIFIED' &&
    (!e.tags || !e.tags.includes('UNVERIFIED'))
  );
}

/**
 * Checks if the given evidence source is potentially stale (> 5 years old).
 */
export function isStaleSource(evidence: EvidenceItem): boolean {
  if (!evidence.effectiveDate) {
    return false;
  }
  
  const effective = new Date(evidence.effectiveDate);
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  
  return effective < fiveYearsAgo;
}
