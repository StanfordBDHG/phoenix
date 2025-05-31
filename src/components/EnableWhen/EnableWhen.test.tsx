import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnableWhen from './EnableWhen';
import { TreeContext } from '../../store/treeStore/treeStore';
import { 
    QuestionnaireItem, 
    QuestionnaireItemEnableWhen, 
    QuestionnaireItemEnableBehaviorCodes,
    ValueSetComposeIncludeConcept 
} from '../../types/fhir';
import { IQuestionnaireMetadata } from '../../types/IQuestionnaireMetadataType';
import { IOperator, IQuestionnaireItemType } from '../../types/IQuestionnareItemType';

// Mock the translation hook
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

// Mock child components
jest.mock('./EnableBehavior', () => ({
    __esModule: true,
    default: ({ dispatchUpdateItemEnableBehavior }: any) => (
        <div data-testid="enable-behavior">
            <button 
                onClick={() => dispatchUpdateItemEnableBehavior(QuestionnaireItemEnableBehaviorCodes.ALL)}
                data-testid="set-all-behavior"
            >
                Set ALL behavior
            </button>
        </div>
    ),
}));

jest.mock('./EnableWhenAnswerTypes', () => ({
    __esModule: true,
    default: ({ dispatchUpdateItemEnableWhen, index }: any) => (
        <div data-testid={`enable-when-answer-types-${index}`}>
            <button 
                onClick={() => dispatchUpdateItemEnableWhen([])}
                data-testid={`answer-types-button-${index}`}
            >
                Answer Types
            </button>
        </div>
    ),
}));

jest.mock('./EnableWhenInfoBox', () => ({
    __esModule: true,
    default: () => <div data-testid="enable-when-info-box">Info Box</div>,
}));

jest.mock('./EnableWhenOperator', () => ({
    __esModule: true,
    default: ({ dispatchUpdateItemEnableWhen, ewIndex }: any) => (
        <div data-testid={`enable-when-operator-${ewIndex}`}>
            <button 
                onClick={() => dispatchUpdateItemEnableWhen([])}
                data-testid={`operator-button-${ewIndex}`}
            >
                Operator
            </button>
        </div>
    ),
}));

describe('EnableWhen', () => {
    const mockDispatch = jest.fn();
    const mockGetItem = jest.fn();
    
    const defaultProps = {
        getItem: mockGetItem,
        conditionalArray: [
            { code: 'question1', display: 'Question 1' },
            { code: 'question2', display: 'Question 2' },
        ] as ValueSetComposeIncludeConcept[],
        linkId: 'current-question',
        enableWhen: [] as QuestionnaireItemEnableWhen[],
        itemValidationErrors: [],
    };

    const mockTreeContext = {
        state: {
            isDirty: false,
            qItems: {},
            qOrder: [],
            qMetadata: {
                title: '',
                description: '',
                resourceType: 'Questionnaire' as const,
                language: 'en',
                name: '',
            } as IQuestionnaireMetadata,
            qContained: [],
        },
        dispatch: mockDispatch,
    };

    const createMockItem = (type: string = IQuestionnaireItemType.string): QuestionnaireItem => ({
        linkId: 'test-item',
        type,
        text: 'Test Question',
        enableWhen: [],
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetItem.mockReturnValue(createMockItem());
    });

    const renderComponent = (props = {}) => {
        return render(
            <TreeContext.Provider value={mockTreeContext}>
                <EnableWhen {...defaultProps} {...props} />
            </TreeContext.Provider>
        );
    };

    it('renders the description text', () => {
        renderComponent();
        expect(screen.getByText(/Define which conditions must be fulfilled for enabling this question/)).toBeInTheDocument();
    });

    it('renders add condition button', () => {
        renderComponent();
        expect(screen.getByRole('button', { name: 'Add a condition' })).toBeInTheDocument();
    });

    it('does not render EnableBehavior when there is only one enableWhen condition', () => {
        const enableWhen = [{ question: 'question1', operator: IOperator.equal }] as QuestionnaireItemEnableWhen[];
        renderComponent({ enableWhen });
        expect(screen.queryByTestId('enable-behavior')).not.toBeInTheDocument();
    });

    it('renders EnableBehavior when there are multiple enableWhen conditions', () => {
        const enableWhen = [
            { question: 'question1', operator: IOperator.equal },
            { question: 'question2', operator: IOperator.equal },
        ] as QuestionnaireItemEnableWhen[];
        renderComponent({ enableWhen });
        expect(screen.getByTestId('enable-behavior')).toBeInTheDocument();
    });

    it('renders enableWhen conditions', () => {
        const enableWhen = [
            { question: 'question1', operator: IOperator.equal },
        ] as QuestionnaireItemEnableWhen[];
        
        mockGetItem.mockImplementation((linkId: string) => {
            if (linkId === 'question1') {
                return createMockItem(IQuestionnaireItemType.string);
            }
            return createMockItem();
        });

        renderComponent({ enableWhen });
        
        const select = screen.getByRole('combobox');
        expect(select).toHaveValue('question1');
        expect(screen.getByTestId('enable-when-operator-0')).toBeInTheDocument();
        expect(screen.getByTestId('enable-when-answer-types-0')).toBeInTheDocument();
    });

    it('adds a new condition when add button is clicked', async () => {
        const user = userEvent.setup();
        renderComponent();
        
        const addButton = screen.getByRole('button', { name: 'Add a condition' });
        await user.click(addButton);
        
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'updateItem',
                linkId: 'current-question',
                itemProperty: 'enableWhen',
                itemValue: [{}],
            })
        );
    });

    it('removes a condition when remove button is clicked', async () => {
        const user = userEvent.setup();
        const enableWhen = [
            { question: 'question1', operator: IOperator.equal },
        ] as QuestionnaireItemEnableWhen[];
        
        mockGetItem.mockImplementation((linkId: string) => {
            if (linkId === 'current-question') {
                return { ...createMockItem(), enableWhen };
            }
            if (linkId === 'question1') {
                return createMockItem(IQuestionnaireItemType.string);
            }
            return createMockItem();
        });

        renderComponent({ enableWhen });
        
        const removeButton = screen.getByRole('button', { name: 'Remove condition' });
        await user.click(removeButton);
        
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'updateItem',
                linkId: 'current-question',
                itemProperty: 'enableWhen',
                itemValue: [],
            })
        );
    });

    it('updates question selection when dropdown changes', async () => {
        const user = userEvent.setup();
        const enableWhen = [
            { question: '', operator: IOperator.equal },
        ] as QuestionnaireItemEnableWhen[];
        
        mockGetItem.mockImplementation((linkId: string) => {
            if (linkId === 'current-question') {
                return { ...createMockItem(), enableWhen };
            }
            return createMockItem();
        });

        renderComponent({ enableWhen });
        
        const select = screen.getByRole('combobox');
        await user.selectOptions(select, 'question1');
        
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'updateItem',
                linkId: 'current-question',
                itemProperty: 'enableWhen',
                itemValue: [{ question: 'question1', operator: IOperator.equal }],
            })
        );
    });

    it('shows unsupported type message for unsupported question types', () => {
        const enableWhen = [
            { question: 'question1', operator: IOperator.equal },
        ] as QuestionnaireItemEnableWhen[];
        
        mockGetItem.mockImplementation((linkId: string) => {
            if (linkId === 'question1') {
                return createMockItem(IQuestionnaireItemType.group);
            }
            if (linkId === 'current-question') {
                return { ...createMockItem(), enableWhen };
            }
            return createMockItem();
        });

        renderComponent({ enableWhen });
        
        expect(screen.getByText('The survey builder does not support enableWhen of type:')).toBeInTheDocument();
        expect(screen.getByText('group')).toBeInTheDocument();
    });

    it('shows non-editable condition message for conditions that cannot be edited', () => {
        const conditionalArray = [{ code: 'question1', display: 'Question 1' }] as ValueSetComposeIncludeConcept[];
        const enableWhen = [
            { question: 'question-not-in-array', operator: IOperator.equal },
        ] as QuestionnaireItemEnableWhen[];

        renderComponent({ enableWhen, conditionalArray });
        
        expect(screen.getByText('This condition cannot be edited in the survey builder:')).toBeInTheDocument();
    });

    it('renders EnableWhenInfoBox when there are enableWhen conditions', () => {
        const enableWhen = [
            { question: 'question1', operator: IOperator.equal },
        ] as QuestionnaireItemEnableWhen[];
        
        mockGetItem.mockImplementation((linkId: string) => {
            if (linkId === 'question1') {
                return createMockItem(IQuestionnaireItemType.string);
            }
            if (linkId === 'current-question') {
                return { ...createMockItem(), enableWhen };
            }
            return createMockItem();
        });

        renderComponent({ enableWhen });
        
        expect(screen.getByTestId('enable-when-info-box')).toBeInTheDocument();
    });

    it('does not render EnableWhenInfoBox when there are no enableWhen conditions', () => {
        renderComponent();
        expect(screen.queryByTestId('enable-when-info-box')).not.toBeInTheDocument();
    });

    it('applies validation error class when there are validation errors', () => {
        const enableWhen = [
            { question: 'question1', operator: IOperator.equal },
        ] as QuestionnaireItemEnableWhen[];
        
        const itemValidationErrors = [
            { errorProperty: 'enableWhen[0].question', index: 0, message: 'Error message' },
        ];
        
        mockGetItem.mockImplementation((linkId: string) => {
            if (linkId === 'question1') {
                return createMockItem(IQuestionnaireItemType.string);
            }
            if (linkId === 'current-question') {
                return { ...createMockItem(), enableWhen };
            }
            return createMockItem();
        });

        renderComponent({ enableWhen, itemValidationErrors });
        
        const enableWhenBox = screen.getByText('Select earlier question:').closest('.enablewhen-box');
        expect(enableWhenBox).toHaveClass('validation-error');
    });

    it('does not show operator and answer types for exists operator', () => {
        const enableWhen = [
            { question: 'question1', operator: IOperator.exists, answerBoolean: true },
        ] as QuestionnaireItemEnableWhen[];
        
        mockGetItem.mockImplementation((linkId: string) => {
            if (linkId === 'question1') {
                return createMockItem(IQuestionnaireItemType.boolean);
            }
            if (linkId === 'current-question') {
                return { ...createMockItem(), enableWhen };
            }
            return createMockItem();
        });

        renderComponent({ enableWhen });
        
        expect(screen.getByTestId('enable-when-operator-0')).toBeInTheDocument();
        // Answer types should not be rendered for exists operator
        expect(screen.queryByTestId('enable-when-answer-types-0')).not.toBeInTheDocument();
    });

    it('updates enable behavior when dispatch function is called', async () => {
        const user = userEvent.setup();
        const enableWhen = [
            { question: 'question1', operator: IOperator.equal },
            { question: 'question2', operator: IOperator.equal },
        ] as QuestionnaireItemEnableWhen[];

        renderComponent({ enableWhen });
        
        const behaviorButton = screen.getByTestId('set-all-behavior');
        await user.click(behaviorButton);
        
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'updateItem',
                linkId: 'current-question',
                itemProperty: 'enableBehavior',
                itemValue: QuestionnaireItemEnableBehaviorCodes.ALL,
            })
        );
    });
});