import type {
  QuestionNode,
  QuestionOption,
  QuestionAnswer,
  AdaptiveQuestionResult,
  ProductClassification,
} from './types.js';
import type { Product } from '../src/types.js';

export function getQuestionTree(): Map<string, QuestionNode> {
  const tree = new Map<string, QuestionNode>();

  tree.set('q-classical', {
    id: 'q-classical',
    question: 'Is this formulation based on a classical Ayurvedic text (e.g., Charaka Samhita, Sushruta Samhita, Bhaishajya Ratnavali)?',
    whyItMatters: 'Classical text-based formulations qualify as generic ASU medicines under Drugs & Cosmetics Act Section 3(a), which changes patent eligibility, licensing pathway, and clinical trial requirements.',
    options: [
      { value: 'yes', label: 'Yes', nextNodeId: 'q-classical-exact' },
      { value: 'no', label: 'No', nextNodeId: 'q-therapeutic-claim' }
    ],
    allowUnknown: true,
    unknownNextNodeId: 'q-therapeutic-claim',
    fieldToUpdate: 'isClassicalTextBased'
  });

  tree.set('q-classical-exact', {
    id: 'q-classical-exact',
    question: 'Does the formulation exactly match a First Schedule classical yoga (same ingredients, same proportions, same dosage form)?',
    whyItMatters: 'An exact classical match invokes Section 3(p) patent bar and Rule 158-B(I) clinical trial exemption. Modified formulations may qualify as Patent & Proprietary under Section 3(h).',
    options: [
      { value: 'yes', label: 'Exact match', nextNodeId: 'q-classical-ref' },
      { value: 'no', label: 'Modified/different ratios', nextNodeId: 'q-novel-process' }
    ],
    allowUnknown: true,
    unknownNextNodeId: 'q-novel-process',
    fieldToUpdate: 'classicalExactMatch'
  });

  tree.set('q-classical-ref', {
    id: 'q-classical-ref',
    question: 'Which classical text and chapter/verse contains this formulation?',
    whyItMatters: 'The authoritative text reference is required for Form 25D licensing and TKDL cross-referencing.',
    options: [
      { value: 'free_text', label: 'Free text input', nextNodeId: 'q-biological-resource' }
    ],
    allowUnknown: false,
    unknownNextNodeId: null,
    fieldToUpdate: 'classicalTextReference'
  });

  tree.set('q-therapeutic-claim', {
    id: 'q-therapeutic-claim',
    question: 'Does the product make any therapeutic or health-related claims?',
    whyItMatters: 'Therapeutic claims trigger Drugs & Cosmetics Act licensing. Non-therapeutic products may qualify as cosmetics or food (Ayurveda Aahar). Certain disease claims are absolutely prohibited under the Drugs & Magic Remedies Act 1954.',
    options: [
      { value: 'yes_therapeutic', label: 'Yes, therapeutic', nextNodeId: 'q-disease-claim' },
      { value: 'no_cosmetic', label: 'No, cosmetic/topical only', nextNodeId: 'q-cosmetic-use' },
      { value: 'no_food', label: 'No, food/nutritional only', nextNodeId: 'q-food-use' }
    ],
    allowUnknown: true,
    unknownNextNodeId: 'q-novel-process',
    fieldToUpdate: 'hasTherapeuticClaim'
  });

  tree.set('q-disease-claim', {
    id: 'q-disease-claim',
    question: 'Do any claims mention specific diseases (e.g., diabetes, cancer, arthritis, hypertension)?',
    whyItMatters: 'The Drugs & Magic Remedies Act 1954 absolutely prohibits advertising cures for 54 scheduled diseases. This is a criminal offense, not just a regulatory violation.',
    options: [
      { value: 'yes', label: 'Yes', nextNodeId: 'q-novel-process' }, // flags DMR scrutiny
      { value: 'no', label: 'No', nextNodeId: 'q-novel-process' }
    ],
    allowUnknown: false,
    unknownNextNodeId: null,
    fieldToUpdate: 'hasDiseaseSpecificClaim'
  });

  tree.set('q-cosmetic-use', {
    id: 'q-cosmetic-use',
    question: 'Is the product intended purely for topical cosmetic use (skin, hair, external application only)?',
    whyItMatters: 'Pure cosmetics follow a separate Drugs & Cosmetics Act pathway with different safety testing and labelling requirements.',
    options: [
      { value: 'yes', label: 'Yes', nextNodeId: 'q-biological-resource' },
      { value: 'no', label: 'No', nextNodeId: 'q-food-use' }
    ],
    allowUnknown: false,
    unknownNextNodeId: null,
    fieldToUpdate: 'isCosmeticOnly'
  });

  tree.set('q-food-use', {
    id: 'q-food-use',
    question: 'Is the product intended as a food, dietary supplement, or nutraceutical (Ayurveda Aahar)?',
    whyItMatters: 'Food products fall under FSSAI Ayurveda Aahar Regulations 2022, which have distinct requirements from drug licensing and absolutely prohibit disease claims.',
    options: [
      { value: 'yes', label: 'Yes', nextNodeId: 'q-biological-resource' },
      { value: 'no', label: 'No', nextNodeId: 'q-novel-process' }
    ],
    allowUnknown: false,
    unknownNextNodeId: null,
    fieldToUpdate: 'isFoodProduct'
  });

  tree.set('q-novel-process', {
    id: 'q-novel-process',
    question: 'Does the formulation use any novel or proprietary process (e.g., nanotechnology, supercritical CO₂ extraction, enhanced bioavailability technology, novel drug delivery)?',
    whyItMatters: 'Novel processes may overcome Section 3(p) traditional knowledge bar and enable process patent protection. They also classify the product as Patent & Proprietary or potentially Phytopharmaceutical.',
    options: [
      { value: 'yes', label: 'Yes', nextNodeId: 'q-novel-ingredient' },
      { value: 'no', label: 'No', nextNodeId: 'q-biological-resource' }
    ],
    allowUnknown: true,
    unknownNextNodeId: 'q-biological-resource',
    fieldToUpdate: 'hasNovelProcess'
  });

  tree.set('q-novel-ingredient', {
    id: 'q-novel-ingredient',
    question: 'Does the formulation contain any novel ingredient, isolated fraction, or purified extract not found in classical texts?',
    whyItMatters: 'Novel fractions/isolates may qualify for product patent protection and may trigger Phytopharmaceutical classification requiring DCGI clinical trials.',
    options: [
      { value: 'yes', label: 'Yes', nextNodeId: 'q-biological-resource' },
      { value: 'no', label: 'No', nextNodeId: 'q-biological-resource' }
    ],
    allowUnknown: false,
    unknownNextNodeId: null,
    fieldToUpdate: 'hasNovelIngredient'
  });

  tree.set('q-biological-resource', {
    id: 'q-biological-resource',
    question: 'What is the source of the biological/plant raw materials?',
    whyItMatters: 'Source determines ABS (Access & Benefit Sharing) obligations under the Biological Diversity Act 2002. Wild-harvested materials have different requirements than cultivated.',
    options: [
      { value: 'cultivated', label: 'Cultivated/farm-grown', nextNodeId: 'q-foreign-participation' },
      { value: 'wild_harvested', label: 'Wild-harvested from natural habitat', nextNodeId: 'q-foreign-participation' },
      { value: 'imported', label: 'Imported from outside India', nextNodeId: 'q-foreign-participation' },
      { value: 'purchased', label: 'Purchased from trader (origin unknown)', nextNodeId: 'q-foreign-participation' } // verification flag
    ],
    allowUnknown: true,
    unknownNextNodeId: 'q-foreign-participation',
    fieldToUpdate: 'resourceSource'
  });

  tree.set('q-foreign-participation', {
    id: 'q-foreign-participation',
    question: 'Is there any foreign equity, foreign management, or foreign collaboration in the applicant entity?',
    whyItMatters: 'Foreign entities or entities with foreign participation require prior NBA approval (Form 1) under Biological Diversity Act Section 3, which is a more stringent requirement than the SBB intimation required for Indian entities.',
    options: [
      { value: 'yes', label: 'Yes', nextNodeId: 'q-export-market' },
      { value: 'no', label: 'No', nextNodeId: 'q-export-market' }
    ],
    allowUnknown: true,
    unknownNextNodeId: 'q-export-market',
    fieldToUpdate: 'hasForeignEquity'
  });

  tree.set('q-export-market', {
    id: 'q-export-market',
    question: 'Is this product intended for export? If so, which is the primary target market?',
    whyItMatters: 'Export markets have distinct regulatory requirements. The US (FDA DSHEA), EU (THMPD), UK (THR), and UAE (MoHAP) each have different frameworks for herbal/Ayurvedic products.',
    options: [
      { value: 'none', label: 'Not for export (India only)', nextNodeId: 'q-fermentation' },
      { value: 'USA', label: 'USA', nextNodeId: 'q-fermentation' },
      { value: 'EU', label: 'EU', nextNodeId: 'q-fermentation' },
      { value: 'UK', label: 'UK', nextNodeId: 'q-fermentation' },
      { value: 'UAE', label: 'UAE', nextNodeId: 'q-fermentation' },
      { value: 'AUSTRALIA', label: 'Australia', nextNodeId: 'q-fermentation' },
      { value: 'OTHER', label: 'Other', nextNodeId: 'q-fermentation' }
    ],
    allowUnknown: false,
    unknownNextNodeId: null,
    fieldToUpdate: 'targetExportMarket'
  });

  tree.set('q-fermentation', {
    id: 'q-fermentation',
    question: 'Does the formulation involve any microbial/fermentation component (e.g., Asava, Arishta, probiotic cultures)?',
    whyItMatters: 'Fermented preparations may require microorganism deposit under the Budapest Treaty for patent applications, and have specific quality control requirements.',
    options: [
      { value: 'yes', label: 'Yes', nextNodeId: 'q-plant-variety' },
      { value: 'no', label: 'No', nextNodeId: 'q-plant-variety' }
    ],
    allowUnknown: true,
    unknownNextNodeId: 'q-plant-variety',
    fieldToUpdate: 'hasFermentationComponent'
  });

  tree.set('q-plant-variety', {
    id: 'q-plant-variety',
    question: 'Does the formulation use a specific improved plant variety or cultivar (e.g., high-withanolide Ashwagandha, specific turmeric cultivar)?',
    whyItMatters: 'Improved cultivars may be registrable under the PPVFR Act 2001 for separate plant variety protection, independent of patent protection.',
    options: [
      { value: 'yes', label: 'Yes', nextNodeId: null },
      { value: 'no', label: 'No', nextNodeId: null }
    ],
    allowUnknown: true,
    unknownNextNodeId: null,
    fieldToUpdate: 'hasSpecificCultivar'
  });

  return tree;
}

export function getNextQuestion(answers: QuestionAnswer[], product?: Partial<Product>): AdaptiveQuestionResult {
  const tree = getQuestionTree();
  const verificationNeeded: string[] = [];

  let currentQuestionId: string | null = 'q-classical';
  
  for (const answer of answers) {
    const node = tree.get(answer.questionId);
    if (!node) continue;

    if (answer.answer === 'unknown' || answer.answer === 'purchased') {
      if (node.fieldToUpdate) {
        verificationNeeded.push(node.fieldToUpdate);
      }
      currentQuestionId = node.unknownNextNodeId;
    } else {
      const option = node.options.find(opt => opt.value === answer.answer);
      if (option) {
        currentQuestionId = option.nextNodeId;
      } else {
        currentQuestionId = null;
      }
    }
  }

  const classificationHint = inferClassification(answers);

  return {
    currentQuestion: currentQuestionId ? tree.get(currentQuestionId) || null : null,
    answeredQuestions: answers,
    nextQuestionId: currentQuestionId,
    classificationHint,
    verificationNeeded,
    isComplete: currentQuestionId === null
  };
}

export function inferClassification(answers: QuestionAnswer[]): ProductClassification {
  const ans = Object.fromEntries(answers.map(a => [a.questionId, a.answer]));

  if (ans['q-classical'] === 'yes' && ans['q-classical-exact'] === 'yes') {
    return 'CLASSICAL_GENERIC';
  }
  
  if (ans['q-classical'] === 'yes' && ans['q-classical-exact'] === 'no') {
    return 'PATENT_PROPRIETARY';
  }

  if (ans['q-therapeutic-claim'] === 'yes_therapeutic' && ans['q-classical'] === 'no') {
    return 'PATENT_PROPRIETARY';
  }
  
  if (ans['q-cosmetic-use'] === 'yes' || ans['q-therapeutic-claim'] === 'no_cosmetic') {
    return 'COSMETIC';
  }

  if (ans['q-food-use'] === 'yes' || ans['q-therapeutic-claim'] === 'no_food') {
    return 'AYURVEDA_AAHAR';
  }

  if (ans['q-novel-ingredient'] === 'yes') {
    return 'PHYTOPHARMACEUTICAL';
  }

  return 'UNCERTAIN';
}

export function applyAnswersToProduct(answers: QuestionAnswer[], product: Partial<Product>): Partial<Product> {
  const updatedProduct = { ...product };
  
  const tree = getQuestionTree();
  
  for (const answer of answers) {
    const node = tree.get(answer.questionId);
    if (node && node.fieldToUpdate) {
      const field = node.fieldToUpdate as string;
      
      let val: any = answer.answer;
      
      if (val === 'yes') val = true;
      else if (val === 'no') val = false;
      else if (val === 'unknown') continue; // Don't override with unknown string, rely on verification flag instead
      else if (field === 'hasTherapeuticClaim') {
         val = val === 'yes_therapeutic';
      }
      
      if (val !== 'unknown' && val !== 'free_text') {
         (updatedProduct as any)[field] = val;
      }
    }
  }

  const inferred = inferClassification(answers);
  if (inferred && inferred !== 'UNCERTAIN') {
    updatedProduct.classification = inferred;
  }

  return updatedProduct;
}
