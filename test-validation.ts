import { validateOrphanedElements } from './src/helpers/orphanValidation';
import { IQuestionnaireItemType } from './src/types/IQuestionnareItemType';

// Mock translation function
const mockT = (key: string) => key;

// Create test data that should trigger validation errors - Display item marked as required
const testData = {
  qOrder: [
    { linkId: 'display-required', items: [] }
  ],
  qItems: {
    'display-required': {
      linkId: 'display-required',
      text: 'This is a display item',
      type: IQuestionnaireItemType.display,
      required: true // This should trigger validation error
    }
  },
  qContained: []
};

console.log('Testing validation...');
console.log('Test item:', JSON.stringify(testData.qItems['display-required'], null, 2));

const validationErrors = validateOrphanedElements(
  mockT,
  testData.qOrder,
  testData.qItems,
  testData.qContained
);

console.log('Validation results:', {
  errorCount: validationErrors.length,
  errors: validationErrors.map(e => ({
    linkId: e.linkId,
    errorProperty: e.errorProperty,
    errorReadableText: e.errorReadableText
  }))
});

if (validationErrors.length === 0) {
  console.log('❌ Expected validation errors but got none');
} else {
  console.log('✅ Validation errors detected as expected');
}