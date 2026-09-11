import { ragEngine } from '../server/ragEngine.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

async function runTests() {
  console.log('--- classification.test.ts ---');
  try {
    const classical = ragEngine.classifyProduct({ isClassicalTextBased: true });
    assert(classical.classification === 'CLASSICAL_GENERIC', 'Classical text product -> CLASSICAL_GENERIC');

    const proprietary = ragEngine.classifyProduct({ isClassicalTextBased: false, intendedUse: 'joint health and mobility' });
    assert(proprietary.classification === 'PATENT_PROPRIETARY', 'Modified formulation -> PATENT_PROPRIETARY');

    const food = ragEngine.classifyProduct({ dosageForm: 'AAHAR_BAR', intendedUse: 'daily nutrition' });
    assert(food.classification === 'AYURVEDA_AAHAR', 'Food product -> AYURVEDA_AAHAR');

    const cosmetic = ragEngine.classifyProduct({ dosageForm: 'CREAM_OINTMENT', intendedUse: 'skin radiance' });
    assert(cosmetic.classification === 'COSMETIC', 'Cosmetic product -> COSMETIC');

    const uncertain = ragEngine.classifyProduct({ name: 'Unknown' });
    assert(uncertain.classification === 'UNCERTAIN', 'Incomplete data -> UNCERTAIN');
  } catch (e: any) {
    console.error('Test failed:', e.message);
    throw e;
  }
}

runTests();
