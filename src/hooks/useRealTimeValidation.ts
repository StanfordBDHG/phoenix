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

// Simple but effective hash function for objects
function hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
}

function hashObject(obj: any): string {
    // Sort keys to ensure consistent ordering
    const sortedString = JSON.stringify(obj, Object.keys(obj).sort());
    const hash = hashString(sortedString);
    return hash.toString(36); // Base36 for shorter strings
}

function generateCacheKey(qOrder: OrderItem[], qItems: Items, qContained: ValueSet[], qAdditionalLanguages?: Languages): string {
    // Generate compact hash keys for each part of the state
    const orderHash = hashObject(qOrder);
    const itemsHash = hashObject(qItems);
    const containedHash = hashObject(qContained);
    const languagesHash = qAdditionalLanguages ? hashObject(qAdditionalLanguages) : '0';
    
    return `${orderHash}.${itemsHash}.${containedHash}.${languagesHash}`;
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