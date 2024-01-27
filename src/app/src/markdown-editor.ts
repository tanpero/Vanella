import { basicSetup } from 'codemirror'
import { EditorView, keymap } from '@codemirror/view'
import { 
        indentWithTab,
        defaultKeymap, historyKeymap,
        history
      } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'

import placeholders from './placeholder-decoration'

declare let editorView: EditorView


type MarkdownProcessor = (markdown: string) => string

export const run = (editorSelector: string,
                    viewerSelector: string,
                    markdownProcessor: MarkdownProcessor
                  ) => {
  const doc = ''
  
  const viewer = document.querySelector(viewerSelector) as HTMLDivElement
  const editor = document.querySelector(editorSelector) as HTMLDivElement
  
  let updateListener = EditorView.updateListener.of(source => {
    if (source.docChanged) {
      viewer.innerHTML = markdownProcessor(source.state.doc.toString())
    }
  })


  editorView = new EditorView({
    doc,
    extensions: [
      placeholders,
      basicSetup,
      history(),
      markdown({
        base: markdownLanguage,
			  codeLanguages: languages
      }),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.lineWrapping,
      updateListener,
    ],
    parent: editor as HTMLDivElement,
  })
}

export const load = (content: string) => {
  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: content
    }
  })
}
