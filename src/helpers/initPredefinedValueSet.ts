import { ValueSet } from '../types/fhir';

export const predefinedValueSetUri = 'http://cardinalkit.org/fhir/ValueSet/Predefined';

export const initPredefinedValueSet = [
    {
        url: predefinedValueSetUri,
        resourceType: 'ValueSet',
        id: '1101',
        version: '1.0',
        name: 'urn:oid:1101',
        title: 'Yes / No',
        status: 'draft',
        publisher: 'NHN',
        compose: {
            include: [
                {
                    system: 'urn:oid:2.16.578.1.12.4.1.1101',
                    concept: [
                        {
                            code: '1',
                            display: 'Yes',
                        },
                        {
                            code: '2',
                            display: 'No',
                        },
                    ],
                },
            ],
        },
    },
    {
        url: predefinedValueSetUri,
        resourceType: 'ValueSet',
        id: '1102',
        version: '1.0',
        name: 'urn:oid:1102',
        title: 'Yes / No / Do not know',
        status: 'draft',
        publisher: 'CardinalKit',
        compose: {
            include: [
                {
                    system: 'urn:oid:2.16.578.1.12.4.1.1102',
                    concept: [
                        {
                            code: '1',
                            display: 'Yes',
                        },
                        {
                            code: '2',
                            display: 'No',
                        },
                        {
                            code: '3',
                            display: 'Do not know',
                        },
                    ],
                },
            ],
        },
    },
    {
        url: predefinedValueSetUri,
        resourceType: 'ValueSet',
        id: '9523',
        version: '1.0',
        name: 'urn:oid:9523',
        title: 'Yes / No / Unsure',
        status: 'draft',
        publisher: 'CardinalKit',
        compose: {
            include: [
                {
                    system: 'urn:oid:2.16.578.1.12.4.1.9523',
                    concept: [
                        {
                            code: '1',
                            display: 'Yes',
                        },
                        {
                            code: '2',
                            display: 'No',
                        },
                        {
                            code: '3',
                            display: 'Unsure',
                        },
                    ],
                },
            ],
        },
    },
] as ValueSet[];
