import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../Modal/Modal';
import { OrderItem, TreeContext } from '../../../store/treeStore/treeStore';
import './TranslationModal.css';
import TranslateItemRow from './TranslateItemRow';
import { getLanguageFromCode } from '../../../helpers/LanguageHelper';
import { QuestionnaireItem } from '../../../types/fhir';
import TranslateMetaData from './TranslateMetaData';
import TranslateContainedValueSets from './TranslateContainedValueSets';
import {
    isIgnorableItem,
    isItemControlHelp,
    isItemControlInline,
    isItemControlSidebar,
} from '../../../helpers/itemControl';
import { IExtentionType } from '../../../types/IQuestionnareItemType';
import { getUsedValueSet } from '../../../helpers/generateQuestionnaire';
import TranslateSettings from './TranslateSettings';

type TranslationModalProps = {
    close: () => void;
    targetLanguage: string;
};

interface FlattOrderTranslation {
    linkId: string;
    path: string;
}

const TranslationModal = (props: TranslationModalProps): JSX.Element => {
    const { t } = useTranslation();
    const { state, dispatch } = useContext(TreeContext);
    const { qItems, qOrder, qAdditionalLanguages, qMetadata, qContained } = state;
    const [flattOrder, setFlattOrder] = useState<FlattOrderTranslation[]>([]);
    const [count, setLimit] = useState(20);

    const isTranslatableItem = (item: QuestionnaireItem): boolean =>
        // Hidden items
        !item.extension?.some((ext) => ext.url === IExtentionType.hidden && ext.valueBoolean) &&
        !isItemControlSidebar(item);

    const translatableItems = Object.values(qItems).filter((question) => {
        return isTranslatableItem(question);
    });

    const usedValueSet = getUsedValueSet(state);
    const valueSetsToTranslate = state.qContained?.filter((x) => x.id && usedValueSet?.includes(x.id) && x);

    const getHeader = (): JSX.Element => (
        <div className="sticky-header">
            {qMetadata.language && (
                <div className="horizontal equal">
                    <div>
                        <label>{getLanguageFromCode(qMetadata.language)?.display}</label>
                    </div>
                    <div>
                        <label>{getLanguageFromCode(props.targetLanguage)?.display}</label>
                    </div>
                </div>
            )}
        </div>
    );

    useEffect(() => {
        const handleChild = (items: OrderItem[], path: string, tempHierarchy: FlattOrderTranslation[]) => {
            let index = 1;
            // Help, sidebar and inline child items (from imported surveys) are not translated here.
            items
                .filter((x) => !isItemControlSidebar(qItems[x.linkId]))
                .forEach((item) => {
                    const childPath = `${path}.${index}`;
                    const tempItem = { linkId: item.linkId, path: childPath } as FlattOrderTranslation;
                    if (!isItemControlHelp(qItems[item.linkId])) {
                        tempHierarchy.push(tempItem);
                        index++;
                    }
                    if (item.items && !isItemControlInline(qItems[item.linkId])) {
                        handleChild(item.items, childPath, tempHierarchy);
                    }
                });
        };

        const flattenOrder = () => {
            const temp = [] as FlattOrderTranslation[];
            qOrder
                .filter((x) => !isIgnorableItem(qItems[x.linkId]))
                .forEach((item, index) => {
                    const itemPath = `${index + 1}`;
                    const tempItem = { linkId: item.linkId, path: itemPath } as FlattOrderTranslation;
                    temp.push(tempItem);
                    if (item.items && !isItemControlInline(qItems[item.linkId])) {
                        handleChild(item.items, itemPath, temp);
                    }
                });
            setFlattOrder([...temp]);
        };

        flattenOrder();

        const options = {
            root: document.getElementById('translation-modal'),
            rootMargin: '63px 0px 0px 0px',
            threshold: [0, 0.5, 1],
        };

        const observed = (elements: IntersectionObserverEntry[]) => {
            if (elements[0].intersectionRatio === 1) {
                setLimit((prevState) => prevState + 25);
            }
        };

        const myObserver = new IntersectionObserver(observed, options);

        const myEl = document.getElementById('bottom-translation-modal');

        if (myEl) {
            myObserver.observe(myEl);
        }

        return function cleanup() {
            myObserver.disconnect();
        };
    }, [qItems, qOrder]);

    const renderItems = (orderItems: FlattOrderTranslation[]): Array<JSX.Element | null> => {
        if (translatableItems && qAdditionalLanguages) {
            return orderItems.map((orderItem) => {
                const item = translatableItems.find((i) => i.linkId === orderItem.linkId);
                if (item) {
                    return (
                        <div key={`${props.targetLanguage}-${item.linkId}`}>
                            <div className="translation-item">
                                <TranslateItemRow
                                    item={item}
                                    targetLanguage={props.targetLanguage}
                                    itemHeading={`${t('Element')} ${orderItem.path}`}
                                />
                            </div>
                        </div>
                    );
                }
                return null;
            });
        }
        return [];
    };

    return (
        <div className="translation-modal">
            <Modal
                close={props.close}
                title={t('Translate questionnaire')}
                id="translation-modal"
                bottomCloseText={t('Close')}
            >
                {getHeader()}
                <div style={{ position: 'relative' }}>
                    <>
                        {qAdditionalLanguages && (
                            <>
                                <TranslateMetaData
                                    state={state}
                                    targetLanguage={props.targetLanguage}
                                    dispatch={dispatch}
                                />
                                <TranslateSettings
                                    targetLanguage={props.targetLanguage}
                                    translations={qAdditionalLanguages}
                                    extensions={qMetadata.extension}
                                    dispatch={dispatch}
                                />
                                {!!qContained && qContained?.length > 0 && (
                                    <TranslateContainedValueSets
                                        qContained={valueSetsToTranslate}
                                        targetLanguage={props.targetLanguage}
                                        translations={qAdditionalLanguages}
                                        dispatch={dispatch}
                                    />
                                )}
                                <div>
                                    <div className="translation-section-header">{t('Elements')}</div>
                                    {renderItems(flattOrder.filter((_, i) => i <= count))}
                                </div>
                                <div
                                    id="bottom-translation-modal"
                                    style={{ height: 1, position: 'absolute', bottom: 500 }}
                                />
                            </>
                        )}
                    </>
                </div>
            </Modal>
        </div>
    );
};

export default TranslationModal;
