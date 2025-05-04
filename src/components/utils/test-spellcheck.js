const { hasMisspelledWords } = require('./spellCheck.js');

// Test cases
const testCases = [
  { query: "constitutional rights", expected: false },
  { query: "constittional rights", expected: true },
  { query: "Sui-Afrika", expected: true },
  { query: "South Africa", expected: false },
  { query: "", expected: false },
  { query: null, expected: false },
  { query: "correctly spelled phrase", expected: false },
  { query: "mispeled phrase", expected: true }
];

// Run tests
async function runTests() {
  console.log('Starting spell check tests...\n');
  
  for (const { query, expected } of testCases) {
    try {
      const result = await hasMisspelledWords(query);
      const status = result === expected ? '✓ PASS' : '✗ FAIL';
      console.log(`${status}: "${query}" -> ${result} (Expected: ${expected})`);
    } catch (error) {
      console.log(`✗ ERROR: "${query}" -> ${error.message}`);
    }
  }
  
  console.log('\nTests completed');
}

runTests();