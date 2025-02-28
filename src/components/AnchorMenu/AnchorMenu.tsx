import './AnchorMenu.css';
import { useState } from 'react';
import { DndProvider, useDrag } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { useTranslation } from 'react-i18next';
import { ActionType, Items, MarkedItem, OrderItem } from '../../store/treeStore/treeStore';
import { IQuestionnaireItemType } from '../../types/IQuestionnareItemType';
import {
    moveItemAction,
    newItemAction,
    reorderItemAction,
    updateMarkedLinkIdAction,
    updateConditionalLogicAction,
} from '../../store/treeStore/treeActions';
import { ValidationErrors } from '../../helpers/orphanValidation';
import { SortableTreeWithoutDndContext as SortableTree } from '@nosferatu500/react-sortable-tree';
import '@nosferatu500/react-sortable-tree/style.css';
import { isIgnorableItem } from '../../helpers/itemControl';
import { generateItemButtons } from './ItemButtons/ItemButtons';
import { canTypeHaveChildren, getInitialItemConfig } from '../../helpers/questionTypeFeatures';
import ConditionPopup from '../ConditionPopUp/ConditionPopup';

interface AnchorMenuProps {
    qOrder: OrderItem[];
    qItems: Items;
    qCurrentItem: MarkedItem | undefined;
    validationErrors: ValidationErrors[];
    dispatch: React.Dispatch<ActionType>;
}

// Interface definition to describe the node structure of the questionnaire tree
interface Node {
    title: string;
    hierarchy?: string;
    nodeType?: IQuestionnaireItemType;
    nodeReadableType?: string;
    children: Node[];
}

interface ExtendedNode {
    node: Node;
    path: any[];
}

// Event type definitions for moving nodes and toggling node visibility in the tree
interface NodeMoveEvent {
    treeData: Node[];
    nextParentNode: Node;
    node: Node;
    nextPath: any[];
    prevPath: any[];
}

interface NodeVisibilityToggleEvent {
    node: Node;
    expanded: boolean;
}

const newNodeLinkId = 'NEW';
const externalNodeType = 'yourNodeType';

const YourExternalNodeComponent = ({ node }: { node: Node }): JSX.Element | null => {
    const getRelevantIcon = (type?: string) => {
        switch (type) {
            case IQuestionnaireItemType.group:
                return 'ion-folder';
            case IQuestionnaireItemType.display:
                return 'ion-information-circled';
            case IQuestionnaireItemType.date:
                return 'ion-calendar';
            case IQuestionnaireItemType.time:
                return 'ion-clock';
            case IQuestionnaireItemType.string:
                return 'ion-edit';
            case IQuestionnaireItemType.integer:
            case IQuestionnaireItemType.decimal:
            case IQuestionnaireItemType.quantity:
                return 'ion-calculator';
            case IQuestionnaireItemType.choice:
                return 'ion-ios-list';
            case IQuestionnaireItemType.attachment:
                return 'ion-document';
            default:
                return 'ion-help-circled';
        }
    };

    const [{ isDragging }, drag] = useDrag(() => ({
        type: externalNodeType,
        item: { node: { ...node } },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const opacity = isDragging ? 0.5 : 1;
    
    return (
        <div
            className="anchor-menu__dragcomponent"
            ref={drag}
            style={{ opacity }}
        >
            <i className={getRelevantIcon(node.nodeType)} /> &nbsp; {node.nodeReadableType}
        </div>
    );
};

// The main component "AnchorMenu"
const AnchorMenu = (props: AnchorMenuProps): JSX.Element => {
    const { t } = useTranslation();
    const [collapsedNodes, setCollapsedNodes] = useState<string[]>([]);
    const [showPopup, setShowPopup] = useState<boolean>(false);
    const [currentNode, setCurrentNode] = useState<Node | null>(null);
    const [initialCondition, setInitialCondition] = useState<string>('true');

    const mapToTreeData = (item: OrderItem[], hierarchy: string, parentLinkId?: string): Node[] => {
        return item
            .filter((x) => {
                const parentItem = parentLinkId ? props.qItems[parentLinkId] : undefined;
                return !isIgnorableItem(props.qItems[x.linkId], parentItem);
            })
            .map((x, index) => {
                const newHierarchy = `${hierarchy}${index + 1}.`;
                return {
                    title: x.linkId,
                    hierarchy: newHierarchy,
                    children: mapToTreeData(x.items, newHierarchy, x.linkId),
                    expanded: collapsedNodes.indexOf(x.linkId) === -1,
                };
            });
    };

    const getNodeKey = (extendedNode: ExtendedNode): string => {
        return extendedNode.node.title;
    };

    // Update treePathToOrderArray to use the helper
    const treePathToOrderArray = (treePath: string[]): string[] => {
        const newPath = [...treePath];
        newPath.splice(-1);
        return newPath;
    };

    const hasValidationError = (linkId: string): boolean => {
        return props.validationErrors.some((error) => error.linkId === linkId);
    };

    const isSelectedItem = (linkId: string): boolean => {
        return props.qCurrentItem?.linkId === linkId;
    };

    const getRelevantIcon = (type?: string) => {
        switch (type) {
            case IQuestionnaireItemType.group:
                return 'folder-icon';
            case IQuestionnaireItemType.display:
                return 'message-icon';
            default:
                return 'question-icon';
        }
    };

    const createTypeComponent = (type: IQuestionnaireItemType, text: string): JSX.Element => {
        return (
            <YourExternalNodeComponent
                node={{
                    title: newNodeLinkId,
                    nodeType: type,
                    nodeReadableType: text,
                    children: [],
                }}
            />
        );
    };

    const handleConditionalLogic = (node: Node) => {
        setCurrentNode(node);
        const currentCondition = props.qItems[node.title]?.condition || 'true';
        setInitialCondition(currentCondition);
        setShowPopup(true);
    };

    const handleSaveCondition = (condition: string) => {
        if (currentNode) {
            props.dispatch(updateConditionalLogicAction(currentNode.title, condition));
        }
        setShowPopup(false);
    };

    const orderTreeData = mapToTreeData(props.qOrder, '');
    return (
        <DndProvider backend={HTML5Backend} {...({} as any)}>
            <div className="questionnaire-overview">
                <div className="questionnaire-overview__toolbox">
                    {createTypeComponent(IQuestionnaireItemType.display, t('Instruction'))}
                    {createTypeComponent(IQuestionnaireItemType.group, t('Group'))}
                    {createTypeComponent(IQuestionnaireItemType.boolean, t('Boolean'))}
                    {createTypeComponent(IQuestionnaireItemType.date, t('Date'))}
                    {createTypeComponent(IQuestionnaireItemType.time, t('Time'))}
                    {createTypeComponent(IQuestionnaireItemType.integer, t('Number'))}
                    {createTypeComponent(IQuestionnaireItemType.choice, t('Multiple Choice'))}
                    {createTypeComponent(IQuestionnaireItemType.string, t('Text'))}
                    {createTypeComponent(IQuestionnaireItemType.attachment, t('Attachment'))}
                </div>
                <SortableTree
                    className="questionnaire-overview__treeview"
                    dndType={externalNodeType}
                    treeData={orderTreeData}
                    onChange={() => {
                        /* dummy */
                    }}
                    getNodeKey={getNodeKey}
                    onMoveNode={({ treeData, nextParentNode, node, nextPath, prevPath }: NodeMoveEvent) => {
                        const newPath = treePathToOrderArray(nextPath);
                        // find parent node:
                        const moveIndex = nextParentNode
                            ? nextParentNode.children.findIndex((x: Node) => x.title === node.title)
                            : treeData.findIndex((x: Node) => x.title === node.title);

                        if (node.title === newNodeLinkId && node.nodeType) {
                            props.dispatch(
                                newItemAction(
                                    getInitialItemConfig(node.nodeType, t('Recipient component')),
                                    newPath,
                                    moveIndex,
                                ),
                            );
                        } else {
                            const oldPath = treePathToOrderArray(prevPath);
                            // reorder within same parent
                            if (JSON.stringify(newPath) === JSON.stringify(oldPath)) {
                                props.dispatch(reorderItemAction(node.title, newPath, moveIndex));
                            } else {
                                props.dispatch(moveItemAction(node.title, newPath, oldPath, moveIndex));
                            }
                        }
                    }}
                    onVisibilityToggle={({ node, expanded }: NodeVisibilityToggleEvent) => {
                        const filteredNodes = collapsedNodes.filter((x) => x !== node.title);
                        if (!expanded) {
                            filteredNodes.push(node.title);
                        }
                        setCollapsedNodes(filteredNodes);
                    }}
                    canNodeHaveChildren={(node: Node): boolean => {
                        const item = props.qItems[node.title];
                        return item ? canTypeHaveChildren(item) : false;
                    }}
                    generateNodeProps={(extendedNode: ExtendedNode) => ({
                        className: `anchor-menu__item 
                            ${hasValidationError(extendedNode.node.title) ? 'validation-error' : ''} 
                            ${extendedNode.path.length === 1 ? 'anchor-menu__topitem' : ''} 
                            ${isSelectedItem(extendedNode.node.title) ? 'anchor-menu__item--selected' : ''}
                        `,
                        title: (
                            <span
                                className="anchor-menu__inneritem"
                                onClick={() => {
                                    props.dispatch(
                                        updateMarkedLinkIdAction(
                                            extendedNode.node.title,
                                            treePathToOrderArray(extendedNode.path),
                                        ),
                                    );
                                }}
                            >
                                <span className={getRelevantIcon(props.qItems[extendedNode.node.title]?.type)} />
                                <span className="anchor-menu__title">
                                    {extendedNode.node.hierarchy}
                                    {` `}
                                    {props.qItems[extendedNode.node.title]?.text}
                                </span>
                            </span>
                        ),
                        buttons: generateItemButtons(
                            t,
                            props.qItems[extendedNode.node.title],
                            treePathToOrderArray(extendedNode.path),
                            false,
                            props.dispatch,
                            () => handleConditionalLogic(extendedNode.node),
                        ),
                    })}
                />
                {props.qOrder.length === 0 && (
                    <div className="anchor-menu__placeholder">
                        <div className="anchor-menu__info">
                            <i className="ion-android-hand" /> &nbsp;
                            {'Drag a question type here to start building your survey!'}
                        </div>
                    </div>
                )}
                {showPopup && (
                    <ConditionPopup
                        key="condition-popup"
                        onClose={() => setShowPopup(false)}
                        onSave={handleSaveCondition}
                        initialCondition={initialCondition}
                    />
                )}
            </div>
        </DndProvider>
    );
};

export default AnchorMenu;