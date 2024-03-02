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
import { forEditor, forViewer } from './scrolling-observer'
import { processorToExport } from './markdown-processor'
import { pasteHTMLAsMarkdown } from './paste-as-markdown'
import { EditorState } from '@codemirror/state'

declare let editorView: EditorView

const theme = EditorView.theme({
  'span.cm-header-1, span.cm-formatting-header-1': {
    color: 'white',
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "lightyellow",
  },
})

let markdownSource: string
let htmlFragment: string

type MarkdownProcessor = (markdown: string) => string

export const run = (editorSelector: string,
                    editorContainerSelector: string,
                    viewerSelector: string,
                    viewerContainerSelector: string,
                    markdownProcessorToView: MarkdownProcessor,
                  ) => {
  const doc = ''
  let currentArea = ''
  
  const editor = document.querySelector(editorSelector) as HTMLDivElement
  const viewer = document.querySelector(viewerSelector) as HTMLDivElement
  const editorContainer = document.querySelector(editorContainerSelector) as HTMLDivElement
  const viewerContainer = document.querySelector(viewerContainerSelector) as HTMLDivElement

  editorContainer.addEventListener('mouseenter', () => {
    currentArea = 'editor'
  })

  viewerContainer.addEventListener('mouseenter', () => {
    currentArea = 'viewer'
  })
  
  let updateListener = EditorView.updateListener.of(source => {
    if (source.docChanged) {
      markdownSource = source.state.doc.toString()
      htmlFragment = markdownProcessorToView(markdownSource)
      viewer.innerHTML = htmlFragment
    }
  })

  const editorState = EditorState.create({
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

      EditorView.domEventHandlers({
        scroll(event, view) {
          forEditor(view, editorContainer, viewer, viewerContainer)
        }
      }),

      syntaxHighlighting(defaultHighlightStyle),
      theme,
      EditorView.lineWrapping,
      updateListener,
    ],
  })


  editorView = new EditorView({
    state: editorState,
    parent: editor as HTMLDivElement,
  })

  viewerContainer.addEventListener('scroll', event => {
    if (currentArea !== 'viewer') return
    forViewer(editorView, editorContainer, viewer, viewerContainer)
  })
  editorView.focus()

  pasteHTMLAsMarkdown(editor)
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

export const exportHTML = async () => String(await processorToExport.process(markdownSource))
