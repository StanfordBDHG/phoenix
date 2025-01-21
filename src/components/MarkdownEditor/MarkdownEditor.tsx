/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState } from 'react';
// @ts-ignore
import { CKEditor } from '@ckeditor/ckeditor5-react';
// @ts-ignore
import Editor from '@helsenorge/ckeditor5-build-markdown';

import './MarkdownEditor.css';

interface MarkdownEditorProps {
    data: string;
    onBlur?: (data: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

const MarkdownEditor = (props: MarkdownEditorProps): JSX.Element => {
    const [value, setValue] = useState<string>(props.data);
    const handleChange = (_unused: unknown, editor: Editor) => {
        setValue(editor.getData());
    };
    const handleBlur = (_unused: unknown, editor: Editor) => {
        if (props.onBlur) {
            props.onBlur(editor.getData());
        }
    };

    const editorConfiguration = {
        toolbar: [
            'heading',
            '|',
            'bold',
            'italic',
            'link',
            'bulletedList',
            'numberedList',
            '|',
            'blockQuote',
            '|',
            'undo',
            'redo',
        ],
        language: 'no-nb',
        placeholder: props.placeholder || '',
    };

    return (
        <CKEditor
            data={value}
            onChange={handleChange}
            onBlur={handleBlur}
            editor={Editor}
            config={editorConfiguration}
            disabled={props.disabled}
        />
    );
};

export default MarkdownEditor;
