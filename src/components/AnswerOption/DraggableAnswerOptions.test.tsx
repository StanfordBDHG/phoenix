import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DraggableAnswerOptions from './DraggableAnswerOptions';
import { QuestionnaireItem, QuestionnaireItemAnswerOption } from '../../types/fhir';
import { IItemProperty } from '../../types/IQuestionnareItemType';

// Mock drag and drop context
jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }: any) => children,
    Droppable: ({ children }: any) => children({
        innerRef: jest.fn(),
        placeholder: null,
    }, { isDraggingOver: false }),
    Draggable: ({ children }: any) => children({
        innerRef: jest.fn(),
        draggableProps: {},
        dragHandleProps: {},
    }, { isDragging: false }),
}));

// Mock AnswerOption component
jest.mock('./AnswerOption', () => ({
    __esModule: true,
    default: ({ changeDisplay, changeCode, answerOption }: any) => (
        <div data-testid={`answer-option-${answerOption.valueCoding?.id}`}>
            <input
                data-testid={`display-input-${answerOption.valueCoding?.id}`}
                defaultValue={answerOption.valueCoding?.display}
                onBlur={changeDisplay}
            />
            <input
                data-testid={`code-input-${answerOption.valueCoding?.id}`}
                defaultValue={answerOption.valueCoding?.code}
                onBlur={changeCode}
            />
        </div>
    ),
}));

describe('DraggableAnswerOptions', () => {
    const mockDispatchUpdateItem = jest.fn();

    const createMockAnswerOption = (id: string, display: string, code: string): QuestionnaireItemAnswerOption => ({
        valueCoding: {
            id,
            display,
            code,
            system: 'test-system',
        },
    });

    const createMockItem = (answerOptions: QuestionnaireItemAnswerOption[]): QuestionnaireItem => ({
        linkId: 'test-question',
        type: 'choice',
        text: 'Test Question',
        answerOption: answerOptions,
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders sync toggle switch with correct default state', () => {
        const answerOptions = [
            createMockAnswerOption('1', 'Option 1', 'opt1'),
            createMockAnswerOption('2', 'Option 2', 'opt2'),
        ];
        const item = createMockItem(answerOptions);

        render(
            <DraggableAnswerOptions 
                item={item} 
                dispatchUpdateItem={mockDispatchUpdateItem} 
            />
        );

        expect(screen.getByText('Auto-generate values from title')).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).toBeChecked(); // Should default to true
    });

    it('toggles sync state when switch is clicked', async () => {
        const user = userEvent.setup();
        const answerOptions = [createMockAnswerOption('1', 'Option 1', 'opt1')];
        const item = createMockItem(answerOptions);

        render(
            <DraggableAnswerOptions 
                item={item} 
                dispatchUpdateItem={mockDispatchUpdateItem} 
            />
        );

        const toggleSwitch = screen.getByRole('checkbox');
        expect(toggleSwitch).toBeChecked();

        await user.click(toggleSwitch);
        expect(toggleSwitch).not.toBeChecked();

        await user.click(toggleSwitch);
        expect(toggleSwitch).toBeChecked();
    });

    it('calls updateAnswerOption with sync enabled when toggle is on', async () => {
        const user = userEvent.setup();
        const answerOptions = [createMockAnswerOption('1', 'Option 1', 'existing_code')];
        const item = createMockItem(answerOptions);

        render(
            <DraggableAnswerOptions 
                item={item} 
                dispatchUpdateItem={mockDispatchUpdateItem} 
            />
        );

        // Sync should be enabled by default
        const displayInput = screen.getByTestId('display-input-1');
        await user.clear(displayInput);
        await user.type(displayInput, 'New Display Text');
        await user.tab(); // Trigger blur event

        expect(mockDispatchUpdateItem).toHaveBeenCalledWith(
            IItemProperty.answerOption,
            expect.arrayContaining([
                expect.objectContaining({
                    valueCoding: expect.objectContaining({
                        id: '1',
                        display: 'New Display Text',
                        code: 'new-display-text', // Should be updated due to sync being enabled
                    }),
                }),
            ])
        );
    });

    it('calls updateAnswerOption with sync disabled when toggle is off', async () => {
        const user = userEvent.setup();
        const answerOptions = [createMockAnswerOption('1', 'Option 1', 'existing_code')];
        const item = createMockItem(answerOptions);

        render(
            <DraggableAnswerOptions 
                item={item} 
                dispatchUpdateItem={mockDispatchUpdateItem} 
            />
        );

        // Turn off sync
        const toggleSwitch = screen.getByRole('checkbox');
        await user.click(toggleSwitch);
        expect(toggleSwitch).not.toBeChecked();

        // Clear previous mock calls
        mockDispatchUpdateItem.mockClear();

        // Change display text
        const displayInput = screen.getByTestId('display-input-1');
        await user.clear(displayInput);
        await user.type(displayInput, 'New Display Text');
        await user.tab(); // Trigger blur event

        expect(mockDispatchUpdateItem).toHaveBeenCalledWith(
            IItemProperty.answerOption,
            expect.arrayContaining([
                expect.objectContaining({
                    valueCoding: expect.objectContaining({
                        id: '1',
                        display: 'New Display Text',
                        code: 'existing_code', // Should preserve existing code when sync is disabled
                    }),
                }),
            ])
        );
    });

    it('renders answer options with correct structure', () => {
        const answerOptions = [
            createMockAnswerOption('1', 'Option 1', 'opt1'),
            createMockAnswerOption('2', 'Option 2', 'opt2'),
        ];
        const item = createMockItem(answerOptions);

        render(
            <DraggableAnswerOptions 
                item={item} 
                dispatchUpdateItem={mockDispatchUpdateItem} 
            />
        );

        expect(screen.getByTestId('answer-option-1')).toBeInTheDocument();
        expect(screen.getByTestId('answer-option-2')).toBeInTheDocument();
        expect(screen.getByTestId('display-input-1')).toBeInTheDocument();
        expect(screen.getByTestId('code-input-1')).toBeInTheDocument();
        expect(screen.getByTestId('display-input-2')).toBeInTheDocument();
        expect(screen.getByTestId('code-input-2')).toBeInTheDocument();
    });

    it('handles empty answer options gracefully', () => {
        const item = createMockItem([]);

        render(
            <DraggableAnswerOptions 
                item={item} 
                dispatchUpdateItem={mockDispatchUpdateItem} 
            />
        );

        expect(screen.getByText('Auto-generate values from title')).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('handles item with no answerOption property', () => {
        const item: QuestionnaireItem = {
            linkId: 'test-question',
            type: 'choice',
            text: 'Test Question',
        };

        render(
            <DraggableAnswerOptions 
                item={item} 
                dispatchUpdateItem={mockDispatchUpdateItem} 
            />
        );

        expect(screen.getByText('Auto-generate values from title')).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).toBeChecked();
    });
});