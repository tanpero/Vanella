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

import justifyBreaklines from './justify-breaklines'

declare let editorView: EditorView

const theme = EditorView.theme({
  'span.cm-header-1, span.cm-formatting-header-1': {
    color: 'white',
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "lightyellow",
  },
})


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
			  codeLanguages: languages,
        extensions: [

        ],
      }),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      syntaxHighlighting(defaultHighlightStyle),
      theme,
      EditorView.lineWrapping,
      updateListener,
    ],
    parent: editor as HTMLDivElement,
  })

  editorView.focus()
}

export const upload = (content: string) => {
  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: content
    }
  })
}

export const download = () => editorView.state.doc.toString()
