import { canTypeHaveChildren } from './questionTypeFeatures';
import { IQuestionnaireItemType } from '../types/IQuestionnareItemType';
import { QuestionnaireItem } from '../types/fhir';

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