import { validateUrl, isOfficialDomain } from '../server/validation.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

async function runTests() {
  console.log('--- urlValidation.test.ts ---');
  try {
    assert(validateUrl('https://example.com').valid, 'Valid HTTPS URL passes');
    assert(validateUrl('http://example.com').valid, 'HTTP URL passes');
    assert(!validateUrl('http://localhost').valid, 'localhost/127.0.0.1 blocked');
    assert(!validateUrl('http://192.168.1.1').valid, 'Private IPs (10.*, 192.168.*) blocked');
    assert(!validateUrl('https://user:pass@example.com').valid, 'Credential URLs (user:pass@host) blocked');
    assert(!validateUrl('file:///etc/passwd').valid, 'file://, ftp:// blocked');
    
    assert(isOfficialDomain('https://ipindia.gov.in/act'), 'Official domains recognized (ipindia.gov.in, wipo.int)');
    assert(!isOfficialDomain('https://example.com'), 'Random domains not official');
  } catch (e: any) {
    console.error('Test failed:', e.message);
    throw e;
  }
}

runTests();
