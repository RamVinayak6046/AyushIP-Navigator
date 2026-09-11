import { resolveBotanical } from '../server/botanicalResolver.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

async function runTests() {
  console.log('--- botanicalResolver.test.ts ---');
  try {
    const ash = resolveBotanical('Ashwagandha');
    assert(Boolean(ash.bestMatch?.botanicalName.includes('Withania somnifera')), 'Ashwagandha resolves to Withania somnifera');

    const har = resolveBotanical('Haridra');
    assert(Boolean(ash.bestMatch?.botanicalName.includes('Withania somnifera') && har.bestMatch?.botanicalName.includes('Curcuma longa')), 'Haridra resolves to Curcuma longa');

    const tur = resolveBotanical('Turmeric');
    assert(Boolean(tur.bestMatch?.botanicalName.includes('Curcuma longa')), 'Turmeric resolves by common name');

    const fuz = resolveBotanical('Ashwagnda');
    assert(Boolean(fuz.bestMatch?.botanicalName.includes('Withania somnifera')), 'Fuzzy match Ashwagnda still resolves');

    const unk = resolveBotanical('UnknownPlantX123');
    assert(unk.bestMatch === null, 'Unknown plant returns empty matches');
  } catch (e: any) {
    console.error('Test failed:', e.message);
    throw e;
  }
}

runTests();
