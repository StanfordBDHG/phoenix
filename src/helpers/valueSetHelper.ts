import { Coding, ValueSet } from '../types/fhir';

export const getValueSetValues = (valueSet: ValueSet | undefined): Coding[] => {
    const codings: Coding[] = [];
    valueSet?.compose?.include.forEach((include) => {
        include?.concept?.forEach((concept) => {
            codings.push({
                code: concept.code,
                system: include.system,
                display: concept.display,
            });
        });
    });

    return codings;
};
