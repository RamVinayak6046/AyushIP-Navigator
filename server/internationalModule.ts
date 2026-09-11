import { AUTHORITATIVE_CORPUS } from './corpus.js';
import type { Product } from '../src/types.js';
import type { TargetMarket, InternationalResult, EvidenceItem } from './types.js';

/**
 * Evaluates international export, treaty compliance, and destination-market access.
 * Covers US FDA DSHEA, EU THMPD Directive 2004/24/EC, UK MHRA, UAE MoHAP, and WIPO GRATK Treaty (2024).
 */
export function evaluateInternational(
  product: Partial<Product>,
  targetMarket: TargetMarket
): InternationalResult {
  let framework = '';
  let traditionalUseRequirement = 'None specified';
  const evidence: EvidenceItem[] = [];
  const recommendations: string[] = [];

  switch (targetMarket) {
    case 'USA':
      framework = 'US FDA Dietary Supplement Health and Education Act (DSHEA 1994), 21 U.S.C. 343(r)(6)';
      traditionalUseRequirement = 'Pre-October 15, 1994 grandfathered status or 75-day New Dietary Ingredient (NDI) notification under 21 CFR 190.6';
      evidence.push({
        id: 'cit-us-fda-dshea',
        framework: 'Federal Food, Drug, and Cosmetic Act (DSHEA 1994)',
        section: '21 U.S.C. 343(r)(6) & 21 CFR 190.6',
        passage: 'Dietary supplements may make structure/function claims accompanied by mandatory FDA disclaimer. Disease treatment, cure, or prevention claims are strictly illegal and render product an unapproved new drug.',
        sourceUrl: 'https://www.fda.gov/food/dietary-supplements',
        authority: 'United States Food and Drug Administration (US FDA)'
      });
      recommendations.push(
        'Audit all packaging to remove curative claims; append mandatory FDA disclaimer: "These statements have not been evaluated by the FDA..."',
        'Verify whether botanical ingredient was marketed in the US prior to Oct 15, 1994; if not, prepare 75-day NDI safety dossier.',
        'Implement 21 CFR Part 111 cGMP compliance for dietary supplement manufacturing.'
      );
      break;

    case 'EU':
      framework = 'Traditional Herbal Medicinal Products Directive (THMPD 2004/24/EC amending Directive 2001/83/EC)';
      traditionalUseRequirement = 'Documented 30 years of safe traditional medicinal use, including at least 15 years within the European Union territory';
      evidence.push({
        id: 'cit-eu-thmpd',
        framework: 'EU Directive 2004/24/EC',
        section: 'Article 16c & EMA HMPC Monographs',
        passage: 'Simplified registration for traditional herbal medicinal products requires bibliographic or expert evidence of medicinal use throughout a period of at least 30 years preceding application, of which at least 15 years in the Union.',
        sourceUrl: 'https://www.ema.europa.eu',
        authority: 'European Medicines Agency (EMA) / HMPC'
      });
      recommendations.push(
        'If lacking 15-year EU commercial history, explore National Food Supplement Mutual Recognition routes across member states.',
        'Cross-reference botanicals with European Medicines Agency (EMA) Community Herbal Monographs for recognized safety profiles.',
        'Comply with EU heavy metal, polycyclic aromatic hydrocarbon (PAH), and pyrrolizidine alkaloid (PA) limit regulations.'
      );
      break;

    case 'UK':
      framework = 'Post-Brexit UK Traditional Herbal Registration (THR) scheme administered by MHRA';
      traditionalUseRequirement = '30 years traditional use (15 years within UK/EU prior to Brexit)';
      evidence.push({
        id: 'cit-uk-mhra-thr',
        framework: 'UK Human Medicines Regulations 2012',
        section: 'Part 7: Traditional Herbal Registrations',
        passage: 'UK Traditional Herbal Registration requires proof of quality standards and traditional use evidence.',
        sourceUrl: 'https://www.gov.uk/mhra',
        authority: 'Medicines and Healthcare products Regulatory Agency (MHRA)'
      });
      recommendations.push(
        'Submit THR application to UK MHRA or market under UK Food Standards Agency (FSA) food supplement rules.'
      );
      break;

    case 'UAE':
      framework = 'Ministry of Health and Prevention (MoHAP) Herbal & Complementary Medicine Guidelines';
      traditionalUseRequirement = 'Certificate of Free Sale (CoFS) from Ministry of Ayush + WHO-GMP compliance';
      evidence.push({
        id: 'cit-uae-mohap',
        framework: 'UAE Federal Law No. 4 of 1983 & MoHAP Guidelines',
        section: 'Circular 28/2018',
        passage: 'Herbal products require Certificate of Pharmaceutical Product (CPP) or Certificate of Free Sale from country of origin and Zone IVa/IVb stability testing.',
        sourceUrl: 'https://mohap.gov.ae',
        authority: 'UAE MoHAP'
      });
      recommendations.push(
        'Obtain Certificate of Free Sale (CoFS) issued by State Ayush Licensing Authority and authenticated by Ministry of External Affairs.',
        'Perform accelerated and real-time stability testing under Zone IVa/IVb (30°C / 65-75% RH) climatic conditions.'
      );
      break;

    case 'AUSTRALIA':
      framework = 'Therapeutic Goods Administration (TGA) Listed Medicines (AUST L) Pathway';
      traditionalUseRequirement = 'Evidence of traditional use or pre-approved TGA Permissible Ingredients List';
      recommendations.push(
        'Verify each botanical ingredient is present on the TGA Permissible Ingredients Determination.',
        'Submit electronic AUST L listing with approved indications.'
      );
      break;

    default:
      framework = 'General International Market Access & Harmonization';
      recommendations.push(
        'Verify destination country classification (Food Supplement vs Herbal Medicine vs OTC Drug).'
      );
  }

  const treatiesApplicable = [
    'WIPO Treaty on IP, Genetic Resources and Associated Traditional Knowledge (GRATK 2024)',
    'Convention on Biological Diversity (CBD) Article 15',
    'Nagoya Protocol on Access and Benefit Sharing (Articles 5, 6, 15)',
    'WTO TRIPS Agreement Article 27'
  ];

  evidence.push(
    {
      id: 'cit-wipo-gratk-2024',
      framework: 'WIPO GRATK Treaty (Geneva, May 24, 2024)',
      section: 'Article 3 & Article 17',
      passage: 'Mandatory disclosure requirements: Patent applicants shall disclose the country of origin of genetic resources and associated traditional knowledge. Entry into force pending 15 ratifications.',
      sourceUrl: 'https://www.wipo.int/treaties/en/ip/gratk',
      authority: 'World Intellectual Property Organization (WIPO)'
    },
    {
      id: 'cit-nagoya-protocol',
      framework: 'Nagoya Protocol on Access and Benefit Sharing (2014)',
      section: 'Article 5, Article 6, Article 15',
      passage: 'Users of genetic resources must obtain Prior Informed Consent (PIC) and establish Mutually Agreed Terms (MAT) with the provider country, verified through Internationally Recognized Certificates of Compliance (IRCC).',
      sourceUrl: 'https://www.cbd.int/abs',
      authority: 'Convention on Biological Diversity (CBD) Secretariat'
    }
  );

  const wipoGratkStatus = 'Adopted at WIPO Diplomatic Conference on May 24, 2024. Entry into force requires 15 ratifications (Article 17). Forward-looking compliance recommended.';
  const wipoGratkDisclosure = 'Prepare Country of Origin Declaration identifying Republic of India and any cited classical AYUSH text or tribal traditional knowledge.';

  return {
    targetMarket,
    treatiesApplicable,
    marketAccessFramework: framework,
    traditionalUseRequirement,
    wipoGratkStatus,
    wipoGratkDisclosure,
    recommendations,
    evidence
  };
}
