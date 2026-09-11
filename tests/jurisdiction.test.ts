import { ragEngine } from '../server/ragEngine.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

async function runTests() {
  console.log('--- jurisdiction.test.ts ---');
  try {
    const indiaResults = ragEngine.search({ query: 'patent', jurisdiction: 'INDIA' });
    assert(indiaResults.evidence.every(r => r.jurisdiction === 'INDIA'), 'India search returns only India evidence');
    
    const intlResults = ragEngine.search({ query: 'patent', jurisdiction: 'INTERNATIONAL' });
    assert(intlResults.evidence.every(r => r.jurisdiction === 'INTERNATIONAL'), 'International search returns only International evidence');
    
    const cross = indiaResults.evidence.some(r => r.jurisdiction === 'INTERNATIONAL');
    assert(!cross, 'No cross-contamination between jurisdictions');
  } catch (e: any) {
    console.error('Test failed:', e.message);
    throw e;
  }
}

runTests();
