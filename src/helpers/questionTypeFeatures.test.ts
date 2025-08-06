import {
    canTypeHaveChildren,
    canTypeBeValidated,
    canTypeHaveSublabel,
    canTypeBeRequired,
    canTypeBeHighlight,
    canTypeBeBeriket,
    canTypeHaveHelp,
    canTypeHaveSummary,
    canTypeHavePrefix,
    canTypeHaveInitialValue,
    canTypeBeReadonly,
    canTypeBeRepeatable,
    canTypeHaveCalculatedExpressionExtension,
    canTypeHavePlaceholderText,
    canTypeHaveTextInput,
    getItemDisplayType,
    createInlineItem,
    getInitialItemConfig
} from './questionTypeFeatures';
import { IExtentionType, IQuestionnaireItemType } from '../types/IQuestionnareItemType';
import { QuestionnaireItem } from '../types/fhir';
import { ItemControlType, createItemControlExtension } from './itemControl';

describe('canTypeHaveChildren', () => {
    it('should allow groups to have children', () => {
        const groupItem: QuestionnaireItem = {
            linkId: 'test-group',
            type: IQuestionnaireItemType.group,
            text: 'Test Group',
        };
        expect(canTypeHaveChildren(groupItem)).toBe(true);
    });

    it('should not allow question types to have children', () => {
        const questionTypes = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.boolean,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.date,
            IQuestionnaireItemType.time,
            IQuestionnaireItemType.text,
            IQuestionnaireItemType.attachment,
            IQuestionnaireItemType.decimal,
            IQuestionnaireItemType.quantity,
        ];

        questionTypes.forEach(type => {
            const questionItem: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHaveChildren(questionItem)).toBe(false);
        });
    });

    it('should not allow display type to have children', () => {
        const displayItem: QuestionnaireItem = {
            linkId: 'test-display',
            type: IQuestionnaireItemType.display,
            text: 'Test Display',
        };
        expect(canTypeHaveChildren(displayItem)).toBe(false);
    });
});

describe('canTypeBeValidated', () => {
    it('should allow validation for validatable types', () => {
        const validatableTypes = [
            IQuestionnaireItemType.attachment,
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.decimal,
            IQuestionnaireItemType.quantity,
            IQuestionnaireItemType.text,
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.date,
            IQuestionnaireItemType.dateTime,
        ];

        validatableTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeBeValidated(item)).toBe(true);
        });
    });

    it('should not allow validation for non-validatable types', () => {
        const nonValidatableTypes = [
            IQuestionnaireItemType.group,
            IQuestionnaireItemType.display,
            IQuestionnaireItemType.boolean,
            IQuestionnaireItemType.choice,
        ];

        nonValidatableTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeBeValidated(item)).toBe(false);
        });
    });

    it('should not allow validation for inline items', () => {
        const inlineExtension = createItemControlExtension(ItemControlType.inline);
        const item: QuestionnaireItem = {
            linkId: 'test-inline',
            type: IQuestionnaireItemType.text,
            text: 'Test Text',
            extension: [inlineExtension],
        };
        expect(canTypeBeValidated(item)).toBe(false);
    });
});

describe('canTypeHaveSublabel', () => {
    it('should allow sublabels for most question types', () => {
        const typesWithSublabels = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.text,
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.date,
            IQuestionnaireItemType.attachment,
        ];

        typesWithSublabels.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHaveSublabel(item)).toBe(true);
        });
    });

    it('should not allow sublabels for excluded types', () => {
        const excludedTypes = [
            IQuestionnaireItemType.group,
            IQuestionnaireItemType.display,
            IQuestionnaireItemType.boolean,
        ];

        excludedTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHaveSublabel(item)).toBe(false);
        });
    });
});

describe('canTypeBeRequired', () => {
    it('should allow required for most question types', () => {
        const requirableTypes = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.text,
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.date,
            IQuestionnaireItemType.attachment,
            IQuestionnaireItemType.boolean,
        ];

        requirableTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeBeRequired(item)).toBe(true);
        });
    });

    it('should not allow required for groups and displays', () => {
        const nonRequirableTypes = [
            IQuestionnaireItemType.group,
            IQuestionnaireItemType.display,
        ];

        nonRequirableTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeBeRequired(item)).toBe(false);
        });
    });
});

describe('canTypeBeHighlight', () => {
    it('should allow highlight for display types', () => {
        const item: QuestionnaireItem = {
            linkId: 'test-display',
            type: IQuestionnaireItemType.display,
            text: 'Test Display',
        };
        expect(canTypeBeHighlight(item)).toBe(true);
    });

    it('should not allow highlight for non-display types', () => {
        const item: QuestionnaireItem = {
            linkId: 'test-string',
            type: IQuestionnaireItemType.string,
            text: 'Test String',
        };
        expect(canTypeBeHighlight(item)).toBe(false);
    });
});

describe('canTypeBeBeriket', () => {
    it('should allow beriket for supported types', () => {
        const beriketTypes = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.text,
            IQuestionnaireItemType.boolean,
            IQuestionnaireItemType.quantity,
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.decimal,
            IQuestionnaireItemType.date,
            IQuestionnaireItemType.dateTime,
            IQuestionnaireItemType.time,
        ];

        beriketTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeBeBeriket(item)).toBe(true);
        });
    });

    it('should not allow beriket for unsupported types', () => {
        const nonBeriketTypes = [
            IQuestionnaireItemType.group,
            IQuestionnaireItemType.display,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.attachment,
        ];

        nonBeriketTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeBeBeriket(item)).toBe(false);
        });
    });
});

describe('canTypeHaveHelp', () => {
    it('should allow help for most types except display', () => {
        const typesWithHelp = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.text,
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.group,
            IQuestionnaireItemType.boolean,
        ];

        typesWithHelp.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHaveHelp(item)).toBe(true);
        });
    });

    it('should not allow help for display types', () => {
        const item: QuestionnaireItem = {
            linkId: 'test-display',
            type: IQuestionnaireItemType.display,
            text: 'Test Display',
        };
        expect(canTypeHaveHelp(item)).toBe(false);
    });
});

describe('canTypeHaveSummary', () => {
    it('should only allow summary for group types', () => {
        const item: QuestionnaireItem = {
            linkId: 'test-group',
            type: IQuestionnaireItemType.group,
            text: 'Test Group',
        };
        expect(canTypeHaveSummary(item)).toBe(true);
    });

    it('should not allow summary for non-group types', () => {
        const nonGroupTypes = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.display,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.boolean,
        ];

        nonGroupTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHaveSummary(item)).toBe(false);
        });
    });
});

describe('canTypeHavePrefix', () => {
    it('should allow prefix for most types except display', () => {
        const typesWithPrefix = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.text,
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.group,
            IQuestionnaireItemType.boolean,
        ];

        typesWithPrefix.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHavePrefix(item)).toBe(true);
        });
    });

    it('should not allow prefix for display types', () => {
        const item: QuestionnaireItem = {
            linkId: 'test-display',
            type: IQuestionnaireItemType.display,
            text: 'Test Display',
        };
        expect(canTypeHavePrefix(item)).toBe(false);
    });
});

describe('canTypeHaveInitialValue', () => {
    it('should allow initial value for question types', () => {
        const typesWithInitial = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.text,
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.boolean,
            IQuestionnaireItemType.date,
        ];

        typesWithInitial.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHaveInitialValue(item)).toBe(true);
        });
    });

    it('should not allow initial value for display and group types', () => {
        const excludedTypes = [
            IQuestionnaireItemType.display,
            IQuestionnaireItemType.group,
        ];

        excludedTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHaveInitialValue(item)).toBe(false);
        });
    });
});

describe('canTypeBeReadonly', () => {
    it('should allow readonly for question types', () => {
        const readonlyTypes = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.text,
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.boolean,
            IQuestionnaireItemType.date,
        ];

        readonlyTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeBeReadonly(item)).toBe(true);
        });
    });

    it('should not allow readonly for display and group types', () => {
        const excludedTypes = [
            IQuestionnaireItemType.display,
            IQuestionnaireItemType.group,
        ];

        excludedTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeBeReadonly(item)).toBe(false);
        });
    });
});

describe('canTypeBeRepeatable', () => {
    it('should allow repeatable for most types except display', () => {
        const repeatableTypes = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.text,
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.group,
            IQuestionnaireItemType.boolean,
        ];

        repeatableTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeBeRepeatable(item)).toBe(true);
        });
    });

    it('should not allow repeatable for display types', () => {
        const item: QuestionnaireItem = {
            linkId: 'test-display',
            type: IQuestionnaireItemType.display,
            text: 'Test Display',
        };
        expect(canTypeBeRepeatable(item)).toBe(false);
    });
});

describe('canTypeHaveCalculatedExpressionExtension', () => {
    it('should allow calculated expression for numeric types', () => {
        const numericTypes = [
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.decimal,
            IQuestionnaireItemType.quantity,
        ];

        numericTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHaveCalculatedExpressionExtension(item)).toBe(true);
        });
    });

    it('should not allow calculated expression for non-numeric types', () => {
        const nonNumericTypes = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.text,
            IQuestionnaireItemType.boolean,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.group,
            IQuestionnaireItemType.display,
        ];

        nonNumericTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHaveCalculatedExpressionExtension(item)).toBe(false);
        });
    });
});

describe('canTypeHavePlaceholderText', () => {
    it('should allow placeholder text for text input types', () => {
        const textTypes = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.text,
        ];

        textTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHavePlaceholderText(item)).toBe(true);
        });
    });

    it('should not allow placeholder text for non-text types', () => {
        const nonTextTypes = [
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.boolean,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.group,
            IQuestionnaireItemType.display,
            IQuestionnaireItemType.date,
        ];

        nonTextTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHavePlaceholderText(item)).toBe(false);
        });
    });
});

describe('canTypeHaveTextInput', () => {
    it('should allow text input for string and text types', () => {
        const textInputTypes = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.text,
        ];

        textInputTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHaveTextInput(item)).toBe(true);
        });
    });

    it('should not allow text input for non-text types', () => {
        const nonTextInputTypes = [
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.boolean,
            IQuestionnaireItemType.choice,
            IQuestionnaireItemType.group,
            IQuestionnaireItemType.display,
            IQuestionnaireItemType.date,
        ];

        nonTextInputTypes.forEach(type => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(canTypeHaveTextInput(item)).toBe(false);
        });
    });
});

describe('getItemDisplayType', () => {
    it('should return correct display names for different types', () => {
        const typeDisplayMap = [
            { type: IQuestionnaireItemType.group, expected: 'Group' },
            { type: IQuestionnaireItemType.display, expected: 'Instruction' },
            { type: IQuestionnaireItemType.string, expected: 'Text' },
            { type: IQuestionnaireItemType.text, expected: 'Text' },
            { type: IQuestionnaireItemType.date, expected: 'Date' },
            { type: IQuestionnaireItemType.dateTime, expected: 'Date' },
            { type: IQuestionnaireItemType.time, expected: 'Time' },
            { type: IQuestionnaireItemType.attachment, expected: 'Attachment' },
            { type: IQuestionnaireItemType.boolean, expected: 'Boolean' },
            { type: IQuestionnaireItemType.choice, expected: 'Choice' },
            { type: IQuestionnaireItemType.openChoice, expected: 'Choice' },
            { type: IQuestionnaireItemType.integer, expected: 'Number' },
            { type: IQuestionnaireItemType.decimal, expected: 'Number' },
            { type: IQuestionnaireItemType.quantity, expected: 'Number' },
        ];

        typeDisplayMap.forEach(({ type, expected }) => {
            const item: QuestionnaireItem = {
                linkId: `test-${type}`,
                type: type,
                text: `Test ${type}`,
            };
            expect(getItemDisplayType(item)).toBe(expected);
        });
    });

    it('should return empty string for unknown types', () => {
        const item: QuestionnaireItem = {
            linkId: 'test-unknown',
            type: 'unknown' as any,
            text: 'Test Unknown',
        };
        expect(getItemDisplayType(item)).toBe('');
    });
});

describe('createInlineItem', () => {
    it('should create an inline display item with correct properties', () => {
        const inlineItem = createInlineItem();
        
        expect(inlineItem.type).toBe(IQuestionnaireItemType.display);
        expect(inlineItem.text).toBe('');
        expect(inlineItem.extension).toEqual([]);
        expect(inlineItem.code).toEqual([]);
        expect(inlineItem.item).toEqual([]);
        expect(inlineItem.required).toBe(false);
        expect(inlineItem.linkId).toBeDefined();
        expect(typeof inlineItem.linkId).toBe('string');
    });
});

describe('getInitialItemConfig', () => {
    it('should create group items with page extension', () => {
        const groupItem = getInitialItemConfig(IQuestionnaireItemType.group, 'test');
        
        expect(groupItem.type).toBe(IQuestionnaireItemType.group);
        expect(groupItem.extension).toBeDefined();
        expect(groupItem.extension?.length).toBeGreaterThan(0);
        
        // Check for page extension
        const pageExtension = groupItem.extension?.find(ext => 
            ext.url === 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl'
        );
        expect(pageExtension).toBeDefined();
    });

    it('should create attachment items with max size extension', () => {
        const attachmentItem = getInitialItemConfig(IQuestionnaireItemType.attachment, 'test');
        
        expect(attachmentItem.type).toBe(IQuestionnaireItemType.attachment);
        
        // Check for max size extension
        const maxSizeExtension = attachmentItem.extension?.find(ext => 
            ext.url === IExtentionType.maxSize
        );
        expect(maxSizeExtension).toBeDefined();
        expect(maxSizeExtension?.valueDecimal).toBeDefined();
    });

    it('should create choice items with answer options', () => {
        const choiceItem = getInitialItemConfig(IQuestionnaireItemType.choice, 'test');
        
        expect(choiceItem.type).toBe(IQuestionnaireItemType.choice);
        expect(choiceItem.answerOption).toBeDefined();
        expect(choiceItem.answerOption?.length).toBe(2);
    });

    it('should create basic items for simple types', () => {
        const simpleTypes = [
            IQuestionnaireItemType.string,
            IQuestionnaireItemType.integer,
            IQuestionnaireItemType.boolean,
            IQuestionnaireItemType.date,
            IQuestionnaireItemType.time,
        ];

        simpleTypes.forEach(type => {
            const item = getInitialItemConfig(type, 'test');
            expect(item.type).toBe(type);
            expect(item.linkId).toBeDefined();
            expect(typeof item.linkId).toBe('string');
        });
    });
});