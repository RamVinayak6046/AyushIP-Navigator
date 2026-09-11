import { Jurisdiction, JurisdictionContext, TargetMarket, EvidenceItem } from './types.js';

/**
 * Validates whether the evidence belongs to the requested jurisdiction.
 * @param evidence The evidence item containing jurisdiction metadata.
 * @param jurisdiction The targeted jurisdiction.
 * @returns boolean true if they match, false otherwise.
 */
export function validateJurisdictionMatch(evidence: EvidenceItem, jurisdiction: Jurisdiction): boolean {
  return evidence.jurisdiction === jurisdiction;
}

/**
 * Returns a human-readable description of the active legal regime.
 * @param jurisdiction The selected jurisdiction.
 * @param targetMarket Optional target market for INTERNATIONAL jurisdiction.
 * @returns A string description.
 */
export function getJurisdictionDescription(jurisdiction: Jurisdiction, targetMarket?: TargetMarket): string {
  if (jurisdiction === 'INDIA') {
    return 'Indian National Legal Regime (e.g., Patents Act, Biological Diversity Act, Drugs & Cosmetics Act, Trademarks Act, etc.)';
  } else {
    let desc = 'International Treaties and Frameworks';
    if (targetMarket) {
      desc += ` with focus on the target market: ${targetMarket}`;
    }
    return desc;
  }
}

/**
 * Routes jurisdiction requests to appropriate context details.
 * @param jurisdiction The requested jurisdiction.
 * @param targetMarket The target market if jurisdiction is INTERNATIONAL.
 * @returns JurisdictionContext populated with frameworks, filter, and description.
 */
export function routeJurisdiction(jurisdiction: Jurisdiction, targetMarket?: TargetMarket): JurisdictionContext {
  if (jurisdiction === 'INDIA') {
    return {
      jurisdiction: 'INDIA',
      corpusFilter: (item: EvidenceItem) => item.jurisdiction === 'INDIA',
      description: getJurisdictionDescription('INDIA'),
      treatyFrameworks: []
    };
  }

  // INTERNATIONAL Context
  const treatyFrameworks = [
    'TRIPS',
    'CBD',
    'Nagoya Protocol',
    'WIPO GRATK Treaty 2024',
    'PCT',
    'Madrid System',
    'Hague System',
    'Budapest Treaty'
  ];

  let marketSpecificFramework = '';
  if (targetMarket) {
    switch (targetMarket) {
      case 'USA': marketSpecificFramework = 'US FDA DSHEA 1994'; break;
      case 'EU': marketSpecificFramework = 'EU THMPD 2004/24/EC'; break;
      case 'UK': marketSpecificFramework = 'UK THR'; break;
      case 'UAE': marketSpecificFramework = 'UAE MoHAP'; break;
      case 'AUSTRALIA': marketSpecificFramework = 'Australia TGA'; break;
    }
  }

  if (marketSpecificFramework) {
    treatyFrameworks.push(marketSpecificFramework);
  }

  return {
    jurisdiction: 'INTERNATIONAL',
    targetMarket,
    corpusFilter: (item: EvidenceItem) => item.jurisdiction === 'INTERNATIONAL',
    description: getJurisdictionDescription('INTERNATIONAL', targetMarket),
    treatyFrameworks
  };
}
