import { AUTHORITATIVE_CORPUS } from './corpus.js';
import type { Product, Jurisdiction } from '../src/types.js';
import type { ABSAssessmentInput, ABSAssessmentResult, EvidenceItem } from './types.js';

/**
 * Evaluates ABS / Biodiversity obligations for a given product.
 * Grounded in Biological Diversity Act 2002 & 2023 Amendment Act provisions.
 */
export function evaluateABS(
  input: ABSAssessmentInput | any,
  product: Partial<Product>,
  jurisdiction: Jurisdiction
): ABSAssessmentResult {
  const formsRequired: string[] = [];
  let authority = 'State Biodiversity Board (SBB)';
  const factualBasis: string[] = [];
  const sourceEvidence: EvidenceItem[] = [];
  const processSteps: string[] = [];
  let uncertaintyFlag = false;
  let uncertaintyReason: string | undefined;
  let exemptionApplicable = false;
  let exemptionReason: string | undefined;

  const hasIndianBiologicalResource = Boolean(
    input?.usesIndianBiologicalResource || input?.biologicalResourcePresent || input?.indianOrigin !== false
  );
  const isForeign = Boolean(
    input?.isForeignEntity || input?.hasForeignEquity || input?.foreignParticipation
  );
  const isIPFiling = Boolean(input?.isIPFiling || input?.ipActivity);
  const isPracticingVaidya = Boolean(
    input?.isPracticingVaidya || input?.isLocalCommunity || input?.applicantType === 'VAIDYA'
  );
  const isCultivated = Boolean(
    input?.isCultivatedRegisteredVariety || input?.resourceSource === 'CULTIVATED'
  );
  const isCommercialUse = Boolean(input?.isCommercialUse !== false);

  if (input?.resourceSourceUnknown) {
    uncertaintyFlag = true;
    uncertaintyReason = 'Resource source is undocumented; statutory provenance determination required.';
    factualBasis.push('Biological resource geographical source requires documentary trace.');
  }

  // Section 7 Proviso: Practicing Vaidya Exemption
  if (isPracticingVaidya) {
    exemptionApplicable = true;
    exemptionReason = 'Section 7 Proviso of Biological Diversity Act 2002 (amended 2023) exempts registered AYUSH practitioners dispensing directly to patients.';
    authority = 'Exempt (Ministry of Ayush / Section 7 Proviso)';
    factualBasis.push('Practicing Vaidya dispensing traditional medicine is statutorily exempted from SBB prior intimation and benefit-sharing levies.');
    sourceEvidence.push({
      id: 'cit-bda-section-7',
      framework: 'Biological Diversity Act, 2002 & 2023 Amendment',
      section: 'Section 7 Proviso',
      passage: 'Registered AYUSH practitioners and local communities practicing indigenous medicine are exempted from prior intimation and ABS obligations.',
      sourceUrl: 'https://nbaindia.org',
      authority: 'National Biodiversity Authority'
    });
    processSteps.push('Maintain registered practitioner license and patient dispensing records on file.');
    return {
      reviewStatus: 'EXEMPT',
      factualBasis,
      authority,
      sourceEvidence,
      formsRequired: [],
      processSteps,
      uncertaintyFlag,
      uncertaintyReason,
      exemptionApplicable: true,
      exemptionReason
    };
  }

  // Cultivated Medicinal Plant Exemption (BDA 2023 Amendment)
  if (isCultivated && !isForeign) {
    exemptionApplicable = true;
    exemptionReason = 'Section 7 of BDA (amended 2023) exempts cultivated medicinal plants and their products from benefit-sharing when supported by Certificate of Origin.';
    authority = 'Exempt (Subject to Certificate of Cultivation)';
    factualBasis.push('Cultivated raw materials with verifiable agricultural source certificate are exempted from commercial utilization levies under 2023 amendments.');
    sourceEvidence.push({
      id: 'cit-bda-amendment-2023',
      framework: 'Biological Diversity (Amendment) Act, 2023',
      section: 'Section 7 Proviso & Section 40',
      passage: 'Cultivated medicinal plants and their derived products are exempt from benefit sharing upon furnishing verifiable Certificate of Origin from local agricultural officer/Gram Panchayat.',
      sourceUrl: 'https://nbaindia.org',
      authority: 'National Biodiversity Authority'
    });
    processSteps.push('Obtain and file Certificate of Origin from local revenue/agriculture officer confirming cultivation.');
    processSteps.push('Retain batch traceability documentation from farm to processing facility.');
  }

  // Section 3: Foreign Entities / Foreign Equity
  if (isForeign && hasIndianBiologicalResource) {
    formsRequired.push('NBA Form 1');
    authority = 'National Biodiversity Authority (NBA)';
    factualBasis.push('Foreign entity or Indian company with foreign equity/management accessing Indian biological resources requires prior approval from NBA under Section 3.');
    sourceEvidence.push({
      id: 'cit-bda-section-3',
      framework: 'Biological Diversity Act, 2002',
      section: 'Section 3',
      passage: 'Certain persons not to obtain biological resource for research or commercial utilization without previous approval of National Biodiversity Authority.',
      sourceUrl: 'https://nbaindia.org',
      authority: 'National Biodiversity Authority'
    });
    processSteps.push('Submit Form 1 application to the National Biodiversity Authority, Chennai with prescribed statutory fee.');
    processSteps.push('Execute formal ABS Agreement with NBA specifying Mutually Agreed Terms (MAT).');
  } else if (!isForeign && hasIndianBiologicalResource && isCommercialUse && !exemptionApplicable) {
    // Section 7: Indian Entities Commercial Utilization
    formsRequired.push('SBB Form 1 / Prior Intimation');
    authority = 'State Biodiversity Board (SBB)';
    factualBasis.push('Indian commercial enterprise utilizing Indian biological resources must give prior intimation to the concerned State Biodiversity Board under Section 7.');
    sourceEvidence.push({
      id: 'cit-bda-section-7',
      framework: 'Biological Diversity Act, 2002 & 2023 Amendment',
      section: 'Section 7',
      passage: 'Prior intimation to State Biodiversity Board for obtaining biological resource for certain purposes.',
      sourceUrl: 'https://nbaindia.org',
      authority: 'State Biodiversity Board'
    });
    processSteps.push('Submit prior intimation in prescribed format to the State Biodiversity Board of the sourcing state.');
    processSteps.push('Calculate applicable ABS fee (0.1% - 0.5% ex-factory sales or specified trader rate) per ABS Guidelines.');
  }

  // Section 6: IPR Filings based on Biological Resources
  if (isIPFiling && hasIndianBiologicalResource) {
    formsRequired.push('NBA Form 3');
    if (!authority || authority === 'State Biodiversity Board (SBB)') {
      authority = 'National Biodiversity Authority (NBA)';
    }
    factualBasis.push('Applying for any intellectual property right in India or abroad based on research or information on biological resources obtained from India requires prior approval of NBA under Section 6.');
    sourceEvidence.push({
      id: 'cit-bda-section-6',
      framework: 'Biological Diversity Act, 2002 & 2023 Amendment',
      section: 'Section 6',
      passage: 'Application for intellectual property rights not to be made without approval of National Biodiversity Authority prior to grant.',
      sourceUrl: 'https://nbaindia.org',
      authority: 'National Biodiversity Authority'
    });
    processSteps.push('Submit Form 3 to NBA before the grant of the patent (may file patent application first, but NBA approval must precede grant).');
  }

  return {
    reviewStatus: exemptionApplicable ? 'EXEMPTION_AVAILABLE' : formsRequired.length > 0 ? 'APPROVAL_MANDATED' : 'CLEAR',
    factualBasis,
    authority,
    sourceEvidence,
    formsRequired,
    processSteps,
    uncertaintyFlag,
    uncertaintyReason,
    exemptionApplicable,
    exemptionReason
  };
}
