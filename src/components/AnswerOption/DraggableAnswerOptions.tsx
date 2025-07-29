import React, { useState } from 'react';
import {
    DragDropContext,
    Draggable,
    DraggingStyle,
    Droppable,
    DropResult,
    NotDraggingStyle,
} from 'react-beautiful-dnd';
import {
    removeOptionFromAnswerOptionArray,
    reorderPositions,
    updateAnswerOption,
    updateAnswerOptionCode,
} from '../../helpers/answerOptionHelper';
import { QuestionnaireItem, QuestionnaireItemAnswerOption } from '../../types/fhir';
import { IItemProperty } from '../../types/IQuestionnareItemType';
import AnswerOption from './AnswerOption';
import SwitchBtn from '../SwitchBtn/SwitchBtn';

interface DraggableAnswerOptionsProps {
    item: QuestionnaireItem;
    dispatchUpdateItem: (
        name: IItemProperty,
        value: string | boolean | QuestionnaireItemAnswerOption[] | Element | undefined,
    ) => void;
}

const DraggableAnswerOptions = ({ item, dispatchUpdateItem }: DraggableAnswerOptionsProps): JSX.Element => {
    const [syncDisplayWithCode, setSyncDisplayWithCode] = useState(true);
    const handleChange = (result: DropResult) => {
        if (!result.source || !result.destination || !result.draggableId) {
            return;
        }

        const fromIndex = result.source.index;
        const toIndex = result.destination.index;

        if (fromIndex !== toIndex) {
            const tempList = item.answerOption ? [...item.answerOption] : [];
            dispatchUpdateItem(IItemProperty.answerOption, reorderPositions(tempList, toIndex, fromIndex));
        }
    };

    const getListStyle = (isDraggingOver: boolean) => ({
        background: isDraggingOver ? 'lightblue' : 'transparent',
    });

    const getItemStyle = (
        isDragging: boolean,
        draggableStyle: DraggingStyle | NotDraggingStyle | undefined,
    ): React.CSSProperties => ({
        userSelect: 'none',
        background: isDragging ? 'lightgreen' : 'transparent',
        cursor: 'pointer',
        ...draggableStyle,
    });

    return (
        <div>
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
                <SwitchBtn
                    value={syncDisplayWithCode}
                    onChange={() => setSyncDisplayWithCode(!syncDisplayWithCode)}
                    label="Auto-generate values from title"
                />
            </div>
            <DragDropContext onDragEnd={handleChange}>
                <Droppable droppableId={`droppable-${item.linkId}-answer-options`} type="stuff">
                {(provided, snapshot) => (
                    <div ref={provided.innerRef} style={getListStyle(snapshot.isDraggingOver)}>
                        {item.answerOption?.map((answerOption, index) => {
                            return (
                                <Draggable
                                    key={answerOption.valueCoding?.id}
                                    draggableId={answerOption.valueCoding?.id || '1'}
                                    index={index}
                                >
                                    {(providedDrag, snapshotDrag) => (
                                        <div
                                            ref={providedDrag.innerRef}
                                            {...providedDrag.draggableProps}
                                            style={getItemStyle(
                                                snapshotDrag.isDragging,
                                                providedDrag.draggableProps.style,
                                            )}
                                        >
                                            <AnswerOption
                                                changeDisplay={(event) => {
                                                    const newArray = updateAnswerOption(
                                                        item.answerOption || [],
                                                        answerOption.valueCoding?.id || '',
                                                        event.target.value,
                                                        syncDisplayWithCode,
                                                    );
                                                    dispatchUpdateItem(IItemProperty.answerOption, newArray);
                                                }}
                                                changeCode={(event) => {
                                                    const newArray = updateAnswerOptionCode(
                                                        item.answerOption || [],
                                                        answerOption.valueCoding?.id || '',
                                                        event.target.value,
                                                    );
                                                    dispatchUpdateItem(IItemProperty.answerOption, newArray);
                                                }}
                                                deleteItem={() => {
                                                    const newArray = removeOptionFromAnswerOptionArray(
                                                        item.answerOption || [],
                                                        answerOption.valueCoding?.id || '',
                                                    );
                                                    dispatchUpdateItem(IItemProperty.answerOption, newArray);
                                                }}
                                                answerOption={answerOption}
                                                handleDrag={providedDrag.dragHandleProps}
                                                showDelete={
                                                    !!item.answerOption?.length && item.answerOption?.length > 2
                                                }
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            );
                        })}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
        </div>
    );
};

export default DraggableAnswerOptions;
