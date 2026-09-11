import { ragEngine } from '../server/ragEngine.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

async function runTests() {
  console.log('--- rag.test.ts ---');
  try {
    const res1 = ragEngine.search({ query: 'patent section 3', jurisdiction: 'INDIA' });
    assert(res1.evidence.length > 0, 'Search for patent section 3 returns relevant results');
    
    const res2 = ragEngine.search({ query: 'patent', jurisdiction: 'INDIA' });
    assert(res2.evidence.every(r => r.jurisdiction === 'INDIA'), 'Search respects jurisdiction filter');
    
    const res3 = ragEngine.search({ query: '', jurisdiction: 'INDIA' });
    assert(res3.evidence.length === 0, 'Empty query returns no results');
    
    const res4 = ragEngine.search({ query: 'guarantee patent grant and predict judicial ruling', jurisdiction: 'INDIA' });
    assert(res4.isAbstentionTriggered === true, 'Safe abstention triggers for speculative queries');
  } catch (e: any) {
    console.error('Test failed:', e.message);
    throw e;
  }
}

runTests();
