import { EvidenceItem } from '../src/types.js';
import { ConflictReport } from './types.js';

/**
 * Detects conflicts between evidence items.
 */
export function detectConflicts(evidenceItems: EvidenceItem[]): ConflictReport {
  const conflicts: ConflictReport['conflicts'] = [];
  const pairs = findOverlappingEvidence(evidenceItems);

  for (const [sourceA, sourceB] of pairs) {
    let isConflict = false;
    let conflictType: 'DIFFERENT_REQUIREMENTS' | 'DIFFERENT_DATES' | 'SUPERSEDED' | 'DISAGREEMENT' = 'DIFFERENT_REQUIREMENTS';

    // Different requirements on same tags
    if (sourceA.framework === sourceB.framework && sourceA.section === sourceB.section && sourceA.passage !== sourceB.passage) {
      isConflict = true;
      conflictType = 'DISAGREEMENT';
    } else if (sourceA.framework === sourceB.framework && sourceA.section === sourceB.section && sourceA.effectiveDate !== sourceB.effectiveDate) {
      isConflict = true;
      conflictType = 'DIFFERENT_DATES';
    } else if ((sourceA.status === 'SUPERSEDED' || sourceB.status === 'SUPERSEDED') && sourceA.framework === sourceB.framework) {
      isConflict = true;
      conflictType = 'SUPERSEDED';
    }

    if (isConflict) {
      const res = resolveConflict(sourceA, sourceB);
      conflicts.push({
        sourceA: {
          id: sourceA.id,
          authority: sourceA.authority,
          section: sourceA.section,
          effectiveDate: sourceA.effectiveDate || '',
          passage: sourceA.passage
        },
        sourceB: {
          id: sourceB.id,
          authority: sourceB.authority,
          section: sourceB.section,
          effectiveDate: sourceB.effectiveDate || '',
          passage: sourceB.passage
        },
        conflictType,
        resolution: res.reason,
        preferredSource: res.preferred.id,
        escalationNeeded: res.needsEscalation
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

/**
 * Resolves a conflict between two evidence sources.
 */
export function resolveConflict(sourceA: EvidenceItem, sourceB: EvidenceItem): { preferred: EvidenceItem; reason: string; needsEscalation: boolean } {
  // Prefer VERIFIED_OFFICIAL over CURATED_DEMO / UNVERIFIED
  if (sourceA.verificationStatus === 'VERIFIED_OFFICIAL' && sourceB.verificationStatus !== 'VERIFIED_OFFICIAL') {
    return { preferred: sourceA, reason: 'Source A is verified official.', needsEscalation: false };
  }
  if (sourceB.verificationStatus === 'VERIFIED_OFFICIAL' && sourceA.verificationStatus !== 'VERIFIED_OFFICIAL') {
    return { preferred: sourceB, reason: 'Source B is verified official.', needsEscalation: false };
  }

  // Prefer source with more recent effectiveDate
  if (sourceA.effectiveDate && sourceB.effectiveDate) {
    const dateA = new Date(sourceA.effectiveDate).getTime();
    const dateB = new Date(sourceB.effectiveDate).getTime();
    if (!isNaN(dateA) && !isNaN(dateB)) {
      if (dateA > dateB) {
        return { preferred: sourceA, reason: 'Source A has a more recent effective date.', needsEscalation: false };
      }
      if (dateB > dateA) {
        return { preferred: sourceB, reason: 'Source B has a more recent effective date.', needsEscalation: false };
      }
    }
  }

  return { preferred: sourceA, reason: 'Equal authority; manual review advised.', needsEscalation: true };
}

/**
 * Finds pairs of evidence items that cover the same framework/section or have tag overlap.
 */
export function findOverlappingEvidence(items: EvidenceItem[]): Array<[EvidenceItem, EvidenceItem]> {
  const pairs: Array<[EvidenceItem, EvidenceItem]> = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];

      // Compare within same jurisdiction
      if (a.jurisdiction !== b.jurisdiction) continue;

      if (a.framework === b.framework && a.section === b.section) {
        pairs.push([a, b]);
      } else if (a.tags && b.tags) {
        const overlap = a.tags.filter(t => b.tags?.includes(t));
        if (overlap.length >= 2) {
          pairs.push([a, b]);
        }
      }
    }
  }

  return pairs;
}
