import { useEffect, useMemo } from 'react';
import { TFunction } from 'react-i18next';
import { ValidationErrors, validateOrphanedElements, validateTranslations } from '../helpers/orphanValidation';
import { Items, OrderItem, Languages } from '../store/treeStore/treeStore';
import { ValueSet } from '../types/fhir';

interface UseRealTimeValidationProps {
    qOrder: OrderItem[];
    qItems: Items;
    qContained: ValueSet[];
    qAdditionalLanguages?: Languages;
    t: TFunction<'translation'>;
    onValidationChange: (validationErrors: ValidationErrors[], translationErrors: ValidationErrors[]) => void;
    debounceMs?: number;
}

// Cache for validation results to avoid unnecessary re-runs
const validationCache = new Map<string, { validationErrors: ValidationErrors[], translationErrors: ValidationErrors[] }>();

function generateCacheKey(qOrder: OrderItem[], qItems: Items, qContained: ValueSet[], qAdditionalLanguages?: Languages): string {
    // Create a hash-like key based on the current state
    // This is a simple implementation - in production you might want to use a proper hash function
    const orderKey = JSON.stringify(qOrder);
    const itemsKey = JSON.stringify(qItems);
    const containedKey = JSON.stringify(qContained);
    const languagesKey = qAdditionalLanguages ? JSON.stringify(qAdditionalLanguages) : 'none';
    
    return `${orderKey}|${itemsKey}|${containedKey}|${languagesKey}`;
}

export const useRealTimeValidation = ({
    qOrder,
    qItems,
    qContained,
    qAdditionalLanguages,
    t,
    onValidationChange,
    debounceMs = 300
}: UseRealTimeValidationProps) => {
    // Generate cache key based on current state
    const cacheKey = useMemo(() => 
        generateCacheKey(qOrder, qItems, qContained, qAdditionalLanguages), 
        [qOrder, qItems, qContained, qAdditionalLanguages]
    );

    useEffect(() => {
        // Check cache first
        const cachedResult = validationCache.get(cacheKey);
        if (cachedResult) {
            onValidationChange(cachedResult.validationErrors, cachedResult.translationErrors);
            return;
        }

        // Debounce validation
        const timeoutId = setTimeout(() => {
            const validationErrors = validateOrphanedElements(t, qOrder, qItems, qContained);
            const translationErrors = qAdditionalLanguages 
                ? validateTranslations(t, qOrder, qItems, qAdditionalLanguages) 
                : [];

            // Cache the results
            validationCache.set(cacheKey, { validationErrors, translationErrors });

            // Limit cache size to prevent memory leaks
            if (validationCache.size > 50) {
                const firstKey = validationCache.keys().next().value;
                if (firstKey) {
                    validationCache.delete(firstKey);
                }
            }

            onValidationChange(validationErrors, translationErrors);
        }, debounceMs);

        return () => clearTimeout(timeoutId);
    }, [cacheKey, t, onValidationChange, debounceMs]);
};