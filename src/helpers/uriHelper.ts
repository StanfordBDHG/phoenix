import createUUID from './CreateUUID';

export const createUrlUUID = (): string => {
    return `http://spezi.health/fhir/questionnaire/${createUUID()}`;
}

export const createUriUUID = (): string => {
    return `urn:uuid:${createUUID()}`;
};

export const isUriValid = (uri: string): boolean => {
    return uri.substr(0, 4) === 'urn:' || uri.substr(0, 7) === 'http://' || uri.substr(0, 8) === 'https://';
};

export enum CodingSystemType {
    valueSetTqqc = 'http://spezi.health/fhir/ValueSet/TQQC',
}
