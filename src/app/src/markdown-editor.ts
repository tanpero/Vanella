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
import { getTreeData } from './scrolling-observer'
import { computedPosition, getEditorElementList, getViewerElementList } from './compute-position'

declare let editorView: EditorView

const theme = EditorView.theme({
  'span.cm-header-1, span.cm-formatting-header-1': {
    color: 'white',
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "lightyellow",
  },
})


let scrollElementIndex: number

type MarkdownProcessor = (markdown: string) => string

export const run = (editorSelector: string,
                    editorContainerSelector: string,
                    viewerSelector: string,
                    viewerContainerSelector: string,
                    markdownProcessor: MarkdownProcessor
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

      EditorView.domEventHandlers({
        scroll(event, view) {
          const self = editor

          if (!self.matches(':hover')) return

          const scrollTop = (event?.target as HTMLElement).scrollTop
          const scrollHeight = (event?.target as HTMLElement).scrollHeight
          const clientHeight = (event?.target as HTMLElement).clientHeight

          computedPosition(view, viewer, getTreeData())

          
          const viewerElementList = getViewerElementList()
          const editorElementList = getEditorElementList()

          editorElementList.forEach((value, index) => {
            if (scrollTop < value) {
              scrollElementIndex = index - 1
              return false
            }
          })

          // 编辑区域已经滚动到底部，那么预览区域也直接滚动到底部
          if (scrollTop >= scrollHeight - clientHeight) {
            viewerContainer.scrollTop =
              viewerContainer.scrollHeight - viewerContainer.clientHeight
            return
          }

          if (scrollElementIndex >= 0) {

            // 编辑区域滚动距离和当前滚动到的节点的 offsetTop 的差值与当前节点高度的比值
            let ratio =
            (scrollTop - editorElementList[scrollElementIndex]) /
            (editorElementList[scrollElementIndex + 1] -
              editorElementList[scrollElementIndex])

            // 根据比值相等计算出预览区域应该滚动到的位置
            const position = ratio *
              (viewerElementList[scrollElementIndex + 1] -
                viewerElementList[scrollElementIndex]) +
                  viewerElementList[scrollElementIndex]
            position && (viewerContainer.scrollTop = position)
              
          }

        }
      }),

      syntaxHighlighting(defaultHighlightStyle),
      theme,
      EditorView.lineWrapping,
      updateListener,
    ],
    parent: editor as HTMLDivElement,
  })

  viewerContainer.addEventListener('scroll', event => {

    if (currentArea !== 'viewer') return

    computedPosition(editorView, viewer, getTreeData())
    
    const viewerElementList = getViewerElementList()
    const editorElementList = getEditorElementList()

    let viewerScrollTop = viewerContainer.scrollTop

    viewerElementList.forEach((value, index) => {
      if (viewerScrollTop < value) {
        scrollElementIndex = index - 1
        return false
      }
    })

    // 已经滚动到底部
    if (
      viewerScrollTop >=
      viewerContainer.scrollHeight - viewerContainer.clientHeight
    ) {
      editorContainer.scrollTo(0, editorContainer.offsetHeight - editorContainer.clientHeight)
      return
    }
    if (scrollElementIndex >= 0) {
      let ratio =
        (viewerScrollTop - viewerElementList[scrollElementIndex]) /
        (viewerElementList[scrollElementIndex + 1] -
          viewerElementList[scrollElementIndex])
      let editorScrollTop =
        ratio *
          (editorElementList[scrollElementIndex + 1] -
            editorElementList[scrollElementIndex]) +
        editorElementList[scrollElementIndex]
        editorScrollTop && editorContainer.scrollTo(0, editorScrollTop)
    }

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
