/**
 * CodeMirror 6 editor bundle for Light MD Viewer.
 * Built by esbuild into lib/codemirror-bundle.js as an IIFE.
 * Exposes window.LightMDEditor with a simple create() API.
 */

import { EditorView, basicSetup } from 'codemirror';
import { keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, classHighlighter } from '@codemirror/language';

// Custom theme matching the original Light MD Viewer styling
const lightMdTheme = EditorView.theme({
  '&': {
    fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
    fontSize: '14px',
  },
  '.cm-content': {
    lineHeight: '1.6',
    padding: '8px 0',
  },
  '.cm-editor': {
    borderRadius: '8px',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '&.cm-focused': {
    outline: 'none',
  },
});

window.LightMDEditor = {
  /**
   * Create a new editor instance.
   * @param {HTMLElement} parent - Container element
   * @param {string} content - Initial markdown content
   * @param {object} callbacks - { onSave: fn, onChange: fn(content) }
   * @returns {{ getValue, refresh, focus }}
   */
  create(parent, content, callbacks) {
    const { onSave, onChange } = callbacks || {};

    const customKeymap = [];
    if (onSave) {
      customKeymap.push({ key: 'Mod-s', run: () => { onSave(); return true; }, preventDefault: true });
    }

    const extensions = [
      basicSetup,
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      syntaxHighlighting(classHighlighter),
      EditorView.lineWrapping,
      lightMdTheme,
    ];

    if (customKeymap.length > 0) {
      extensions.push(keymap.of(customKeymap));
    }

    if (onChange) {
      extensions.push(EditorView.updateListener.of(update => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }));
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions,
      }),
      parent,
    });

    return {
      getValue() {
        return view.state.doc.toString();
      },
      refresh() {
        view.requestMeasure();
      },
      focus() {
        view.focus();
      },
    };
  },
};
