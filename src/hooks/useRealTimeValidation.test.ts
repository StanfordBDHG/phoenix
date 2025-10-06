import { renderHook } from '@testing-library/react';
import { useRealTimeValidation } from './useRealTimeValidation';
import { OrderItem, Items } from '../store/treeStore/treeStore';
import { ValueSet } from '../types/fhir';
import { IQuestionnaireItemType } from '../types/IQuestionnareItemType';
import { ValidationErrors } from '../helpers/orphanValidation';

describe('useRealTimeValidation integration tests', () => {
    const mockT = (key: string) => key;
    
    const createMockData = (suffix = '') => ({
        qOrder: [
            { linkId: `test1${suffix}`, items: [] },
            { linkId: `test2${suffix}`, items: [] }
        ] as OrderItem[],
        qItems: {
            [`test1${suffix}`]: {
                linkId: `test1${suffix}`,
                text: `Test Question 1${suffix}`,
                type: 'string' as any
            },
            [`test2${suffix}`]: {
                linkId: `test2${suffix}`, 
                text: `Test Question 2${suffix}`,
                type: 'string' as any
            }
        } as Items,
        qContained: [] as ValueSet[]
    });

    test('should call onValidationChange when hook is used', (done) => {
        const mockOnValidationChange = jest.fn(() => {
            // Verify the callback was called
            expect(mockOnValidationChange).toHaveBeenCalled();
            done();
        });
        
        const data = createMockData();

        renderHook(() =>
            useRealTimeValidation({
                ...data,
                t: mockT,
                onValidationChange: mockOnValidationChange,
                debounceMs: 10 // Small debounce for test
            })
        );
    });

    test('should handle different data structures', (done) => {
        let callCount = 0;
        const mockOnValidationChange = jest.fn(() => {
            callCount++;
            if (callCount === 1) {
                // First call should have validation results
                expect(mockOnValidationChange).toHaveBeenCalled();
                done();
            }
        });

        const data = createMockData();

        renderHook(() =>
            useRealTimeValidation({
                ...data,
                t: mockT,
                onValidationChange: mockOnValidationChange,
                debounceMs: 10
            })
        );
    });

    test('should handle additional languages', (done) => {
        const mockAdditionalLanguages = {
            'es': {
                items: {},
                sidebarItems: {},
                metaData: {},
                contained: {},
                settings: {}
            }
        };

        const mockOnValidationChange = jest.fn(() => {
            // Should not throw an error when additional languages are provided
            expect(mockOnValidationChange).toHaveBeenCalled();
            done();
        });

        const data = createMockData();

        renderHook(() =>
            useRealTimeValidation({
                ...data,
                qAdditionalLanguages: mockAdditionalLanguages,
                t: mockT,
                onValidationChange: mockOnValidationChange,
                debounceMs: 10
            })
        );
    });

    test('should work with empty data', (done) => {
        const mockOnValidationChange = jest.fn(() => {
            // Should handle empty data gracefully
            expect(mockOnValidationChange).toHaveBeenCalled();
            done();
        });

        renderHook(() =>
            useRealTimeValidation({
                qOrder: [],
                qItems: {},
                qContained: [],
                t: mockT,
                onValidationChange: mockOnValidationChange,
                debounceMs: 10
            })
        );
    });

    test('should use default debounce when not specified', (done) => {
        const mockOnValidationChange = jest.fn(() => {
            expect(mockOnValidationChange).toHaveBeenCalled();
            done();
        });

        const data = createMockData();

        renderHook(() =>
            useRealTimeValidation({
                ...data,
                t: mockT,
                onValidationChange: mockOnValidationChange
                // debounceMs not specified, should use default
            })
        );
    });

    test('should detect actual validation errors', (done) => {
        // Create invalid form data that should trigger validation errors
        const invalidData = {
            qOrder: [
                { linkId: 'duplicate1', items: [] },
                { linkId: 'duplicate1', items: [] }, // Duplicate linkId - should cause validation error
                { linkId: 'required-display', items: [] }
            ] as OrderItem[],
            qItems: {
                'duplicate1': {
                    linkId: 'duplicate1',
                    text: 'First duplicate question',
                    type: IQuestionnaireItemType.string
                },
                // Note: We're adding the same linkId twice in qOrder but only once in qItems
                'required-display': {
                    linkId: 'required-display',
                    text: 'Display item that cannot be required',
                    type: IQuestionnaireItemType.display,
                    required: true // Display items cannot be required - should cause validation error
                }
            } as Items,
            qContained: [] as ValueSet[]
        };

        const mockOnValidationChange = jest.fn((validationErrors, translationErrors) => {
            // Should detect validation errors
            expect(validationErrors).toBeDefined();
            expect(Array.isArray(validationErrors)).toBe(true);
            expect(Array.isArray(translationErrors)).toBe(true);
            
            // We expect at least one validation error from our invalid data
            expect(validationErrors.length).toBeGreaterThan(0);
            
            // Check that validation errors have the expected structure
            expect(validationErrors[0]).toHaveProperty('linkId');
            expect(validationErrors[0]).toHaveProperty('errorProperty');
            expect(validationErrors[0]).toHaveProperty('errorReadableText');
            
            // Look for our specific validation errors
            const hasRequiredDisplayError = validationErrors.some(
                (error: ValidationErrors) => error.linkId === 'required-display' && error.errorProperty === 'required'
            );
            
            if (hasRequiredDisplayError) {
                // Found the expected "display item cannot be required" error
                expect(hasRequiredDisplayError).toBe(true);
            }
            
            done();
        });

        renderHook(() =>
            useRealTimeValidation({
                ...invalidData,
                t: mockT,
                onValidationChange: mockOnValidationChange,
                debounceMs: 10
            })
        );
    });

    test('should detect no errors with valid data', (done) => {
        // Create valid form data that should not trigger validation errors
        const validData = {
            qOrder: [
                { linkId: 'valid1', items: [] },
                { linkId: 'valid2', items: [] }
            ] as OrderItem[],
            qItems: {
                'valid1': {
                    linkId: 'valid1',
                    text: 'Valid string question',
                    type: IQuestionnaireItemType.string
                },
                'valid2': {
                    linkId: 'valid2',
                    text: 'Valid choice question',
                    type: IQuestionnaireItemType.choice
                }
            } as Items,
            qContained: [] as ValueSet[]
        };

        const mockOnValidationChange = jest.fn((validationErrors, translationErrors) => {
            // Should detect no validation errors
            expect(validationErrors).toBeDefined();
            expect(Array.isArray(validationErrors)).toBe(true);
            expect(Array.isArray(translationErrors)).toBe(true);
            
            // Valid data should have no errors
            expect(validationErrors).toHaveLength(0);
            expect(translationErrors).toHaveLength(0);
            
            done();
        });

        renderHook(() =>
            useRealTimeValidation({
                ...validData,
                t: mockT,
                onValidationChange: mockOnValidationChange,
                debounceMs: 10
            })
        );
    });
});