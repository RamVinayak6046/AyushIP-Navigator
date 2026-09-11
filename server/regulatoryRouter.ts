import { AUTHORITATIVE_CORPUS } from './corpus.js';
import type { Product, ProductClassification, Jurisdiction } from '../src/types.js';
import type { RegulatoryRouteResult, EvidenceItem } from './types.js';

/**
 * Routes the product through the appropriate regulatory framework based on its classification.
 * Grounded in Drugs & Cosmetics Act 1940, Rules 1945, and FSSAI Ayurveda Aahar Regulations 2022.
 */
export function routeRegulatory(
  product: Partial<Product>,
  classification: ProductClassification,
  jurisdiction: Jurisdiction
): RegulatoryRouteResult {
  let pathway = '';
  let framework = '';
  let licensingAuthority = 'State AYUSH Licensing Authority (SALA)';
  const documentationRequired: string[] = [];
  const safetyTestingRequired: string[] = ['Heavy metals (Lead, Cadmium, Mercury, Arsenic) limits per API', 'Microbial load enumeration'];
  const labellingMandates: string[] = ['Rule 161 D&C Rules: Manufacturing license number, batch details, complete ingredient list with Latin/botanical names'];
  const advertisingScrutiny: string[] = [];
  const evidence: EvidenceItem[] = [];
  const uncertainties: string[] = [];

  switch (classification) {
    case 'CLASSICAL_GENERIC':
      pathway = 'Form 25D Classical Ayurvedic Drug License';
      framework = 'Drugs & Cosmetics Act 1940 Section 3(a) & Rule 158-B(I)';
      documentationRequired.push(
        'Authoritative classical text citation from First Schedule of D&C Act 1940',
        'Standard Operating Procedure (SOP) identical to classical yoga text',
        'Schedule T GMP compliance certificate for manufacturing premises'
      );
      evidence.push({
        id: 'cit-dc-act-3a',
        framework: 'Drugs and Cosmetics Act, 1940',
        section: 'Section 3(a) & First Schedule',
        passage: 'Ayurvedic, Siddha or Unani drug includes all medicines intended for internal or external use manufactured exclusively in accordance with the formulae described in the authoritative books specified in the First Schedule.',
        sourceUrl: 'https://ayush.gov.in',
        authority: 'Ministry of Ayush / CDSCO'
      });
      break;

    case 'PATENT_PROPRIETARY':
      pathway = 'Form 25D Patent or Proprietary ASU Medicine License';
      framework = 'Drugs & Cosmetics Act 1940 Section 3(h) & Rule 158-B(II)';
      documentationRequired.push(
        'Published scientific evidence / safety literature from official pharmacopoeias',
        'Formula rationale and manufacturing process flow',
        'Schedule T GMP compliance records'
      );
      safetyTestingRequired.push('Acute oral toxicity study data per Rule 158-B(II)(B)');
      evidence.push({
        id: 'cit-dc-rules-158b',
        framework: 'Drugs and Cosmetics Rules, 1945',
        section: 'Rule 158-B',
        passage: 'Conditions for grant of license for manufacture of Patent or Proprietary Ayurvedic medicines require documentary evidence of safety and traditional/published efficacy references.',
        sourceUrl: 'https://ayush.gov.in',
        authority: 'State Licensing Authority'
      });
      break;

    case 'PHYTOPHARMACEUTICAL':
      pathway = 'New Drug Approval under Rule 122-E & Phytopharmaceutical Regulations';
      framework = 'Drugs and Cosmetics Rules, 1945 (Sixth Amendment 2015)';
      licensingAuthority = 'Central Drugs Standard Control Organization (CDSCO) / DCGI';
      documentationRequired.push(
        'Chemical profiling with at least 4 bioactive marker compounds',
        'Standardized aqueous or alcoholic extraction fingerprint (HPTLC/HPLC)',
        'Preclinical animal toxicology profile (OECD guidelines)',
        'Clinical trial protocol and ethics committee approvals per Schedule Y'
      );
      safetyTestingRequired.push('OECD 423 Acute Toxicity', '90-day subchronic toxicity in rodents/non-rodents', 'Genotoxicity battery');
      evidence.push({
        id: 'cit-cdsco-phytopharma',
        framework: 'Drugs and Cosmetics Rules (Sixth Amendment 2015)',
        section: 'Rule 122-E & Schedule Y-1',
        passage: 'Phytopharmaceutical drug means purified and standardized fraction with defined minimum four marker compounds of a medicinal plant, requiring full clinical trial investigation.',
        sourceUrl: 'https://cdsco.gov.in',
        authority: 'DCGI / CDSCO'
      });
      break;

    case 'AYURVEDA_AAHAR':
      pathway = 'FSSAI Food License / Registration (Ayurveda Aahar Category 13.5)';
      framework = 'Food Safety and Standards (Ayurveda Aahar) Regulations, 2022';
      licensingAuthority = 'Food Safety and Standards Authority of India (FSSAI) Special Expert Committee';
      documentationRequired.push(
        'Proof that recipe is documented in First Schedule texts or listed in Schedule I/II of FSSAI 2022 regulations',
        'Food safety and hygiene certification (Schedule 4 FSS (Licensing) Regulations)'
      );
      labellingMandates.push(
        'Mandatory official green Ayurveda Aahar logo on principal display panel',
        'Advisory warning: ONLY FOR DIETARY WELLBEING — NOT FOR MEDICINAL USE',
        'Strict statutory prohibition on curative or therapeutic disease treatment claims'
      );
      evidence.push({
        id: 'cit-fssai-ayurveda-aahar',
        framework: 'Food Safety and Standards (Ayurveda Aahar) Regulations, 2022',
        section: 'Regulation 4 & Regulation 8',
        passage: 'Ayurveda Aahar shall not contain synthetic minerals or vitamins added. No disease cure or prevention claims are permissible under any circumstances.',
        sourceUrl: 'https://fssai.gov.in',
        authority: 'FSSAI'
      });
      break;

    case 'COSMETIC':
      pathway = 'Cosmetics Manufacturing License';
      framework = 'Cosmetics Rules, 2020 & D&C Act 1940';
      documentationRequired.push('Safety assessment report for cosmetic ingredients', 'Heavy metal limit test reports');
      evidence.push({
        id: 'cit-cosmetics-rules-2020',
        framework: 'Cosmetics Rules, 2020',
        section: 'Part III & Fifth Schedule',
        passage: 'Cosmetic standards mandate non-toxicity on skin and adherence to BIS microbiological standards.',
        sourceUrl: 'https://cdsco.gov.in',
        authority: 'State Licensing Authority'
      });
      break;

    case 'NEW_NON_CLASSICAL':
      pathway = 'Schedule Y New ASU Drug Investigation';
      framework = 'Drugs and Cosmetics Rules, 1945';
      licensingAuthority = 'Ministry of Ayush / DCGI Joint Board';
      documentationRequired.push('Complete pharmacological and human safety trial data');
      safetyTestingRequired.push('Phase I/II clinical trials per GCP guidelines');
      uncertainties.push('High regulatory burden due to lack of classical textual precedent.');
      break;

    default:
      pathway = 'Classification Resolution Required';
      framework = 'Statutory Evaluation Pending';
      uncertainties.push('Classification is uncertain; perform botanical and classical ingredient matching before submitting license dossier.');
      break;
  }

  // DMR Act 1954 Advertising Check
  if (product.healthClaims && product.healthClaims.length > 0) {
    advertisingScrutiny.push('Claims screened against Section 3 of Drugs and Magic Remedies (Objectionable Advertisements) Act 1954.');
    const dmrDiseases = ['diabetes', 'arthritis', 'cancer', 'hypertension', 'sexual impotence', 'kidney stone', 'paralysis', 'epilepsy', 'asthma'];
    const violative = product.healthClaims.filter(c => dmrDiseases.some(d => c.toLowerCase().includes(d)));
    if (violative.length > 0) {
      advertisingScrutiny.push(`POTENTIAL VIOLATION: Claim contains statutorily prohibited disease terms (${violative.join(', ')}). Convert to physiological structure/function support terms.`);
      evidence.push({
        id: 'cit-dmr-act-1954',
        framework: 'Drugs and Magic Remedies (Objectionable Advertisements) Act, 1954',
        section: 'Section 3 & Schedule',
        passage: 'Prohibition of advertisement of certain drugs for treatment of specified diseases and disorders. Absolute prohibition applies to consumer marketing.',
        sourceUrl: 'https://ayush.gov.in',
        authority: 'Ministry of Health & Family Welfare'
      });
    } else {
      advertisingScrutiny.push('No direct Schedule disease terms detected. Ensure marketing literature focuses on Rasayana / physiological balance.');
    }
  }

  return {
    pathway,
    framework,
    licensingAuthority,
    documentationRequired,
    safetyTestingRequired,
    labellingMandates,
    advertisingScrutiny,
    evidence,
    uncertainties
  };
}
