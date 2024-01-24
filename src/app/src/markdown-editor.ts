import { basicSetup } from 'codemirror'
import { EditorView, keymap } from '@codemirror/view'
import { Compartment, EditorState } from '@codemirror/state'
import { 
        indentWithTab,
        defaultKeymap, historyKeymap,
        history
      } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'


type MarkdownProcessor = (markdown: string) => string

const theme = new Compartment()

export const run = (editorSelector: string,
                    viewerSelector: string,
                    markdownProcessor: MarkdownProcessor
                  ) => {
  const doc = `
  # Hello world
  ---
  **Marisa**
  `
  
  const viewer = document.querySelector(viewerSelector) as HTMLDivElement
  const editor = document.querySelector(editorSelector) as HTMLDivElement
  
  let updateListener = EditorView.updateListener.of(source => {
    if (source.docChanged) {
      viewer.innerHTML = markdownProcessor(source.state.doc.toString())
    }
  })


  new EditorView({
    doc,
    extensions: [
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
    parent: editor as HTMLDivElement
  })
}
