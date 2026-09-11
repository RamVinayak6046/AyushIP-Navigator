import { getNextQuestion, inferClassification } from '../server/adaptiveQuestions.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

async function runTests() {
  console.log('--- adaptiveQuestions.test.ts ---');
  try {
    const q1 = getNextQuestion([]);
    assert(Boolean(q1.currentQuestion?.question.includes('classical Ayurvedic text')), 'First question is about classical text');
    
    const q2 = getNextQuestion([{ questionId: 'q-classical', answer: 'yes', timestamp: new Date().toISOString() }]);
    assert(Boolean(q2.currentQuestion?.question.includes('exactly match')), 'Answering yes to classical leads to exact match question');
    
    const flag = getNextQuestion([{ questionId: 'q-classical', answer: 'unknown', timestamp: new Date().toISOString() }]);
    assert(flag.verificationNeeded.length > 0, 'unknown answers trigger verification flags');
    
    const classification = inferClassification([
      { questionId: 'q-classical', answer: 'yes', timestamp: new Date().toISOString() },
      { questionId: 'q-classical-exact', answer: 'yes', timestamp: new Date().toISOString() }
    ]);
    assert(classification === 'CLASSICAL_GENERIC', 'Complete flow produces classification');
  } catch (e: any) {
    console.error('Test failed:', e.message);
    throw e;
  }
}

runTests();
