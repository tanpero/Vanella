import { EditorView } from "codemirror"
import { Node } from "unified/lib"

let editorElementList: number[]
let viewerElementList: number[]

export const computedPosition = (editor: EditorView, viewer: HTMLElement, treeData: Node) => {

  let viewerChildNodes = viewer.childNodes
  editorElementList = []
  viewerElementList = []

  treeData.children.forEach((child, index) => {
    if (child.type !== 'element' || !child.position) return
    
    const line = child.position.start.line
    const lineStart = editor.state.doc.line(line).from as number
    const offsetTop = editor.coordsAtPos(lineStart - 1, 1)?.top
    if (child.children[0]?.value && offsetTop) {
      editorElementList.push(offsetTop)
      viewerElementList.push(viewerChildNodes[index].offsetTop)
    }
  })
}

export const getEditorElementList = () => editorElementList
export const getViewerElementList = () => viewerElementList
  