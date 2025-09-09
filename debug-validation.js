// Simple Node.js test to debug validation
const { validateOrphanedElements } = require('./src/helpers/orphanValidation.ts');

// Mock translation function
const mockT = (key) => key;

// Create test data that should trigger validation errors
const testData = {
  qOrder: [
    { linkId: 'display-required', items: [] }
  ],
  qItems: {
    'display-required': {
      linkId: 'display-required',
      text: 'This is a display item',
      type: 'display',
      required: true // This should trigger validation error
    }
  },
  qContained: []
};

console.log('Testing validation with display item marked as required...');
console.log('Input data:', JSON.stringify(testData, null, 2));

try {
  const validationErrors = validateOrphanedElements(
    mockT,
    testData.qOrder,
    testData.qItems,
    testData.qContained
  );
  
  console.log('Validation results:', {
    errorCount: validationErrors.length,
    errors: validationErrors
  });
  
  if (validationErrors.length === 0) {
    console.log('❌ Expected validation errors but got none');
  } else {
    console.log('✅ Validation errors detected as expected');
  }
} catch (error) {
  console.error('Error running validation:', error);
}