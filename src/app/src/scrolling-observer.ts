import { EditorView } from 'codemirror'
import { Node as Node } from 'unified/lib'
import { computedPosition, getEditorElementList, getViewerElementList } from './compute-position'

let treeData: Node

export const getTreeData = () => treeData

export const scrollingObserver = () => (tree, file) => {
  treeData = tree
}

let scrollElementIndex: number

export const forEditor = (editorView: EditorView,
                          editorContainer: HTMLDivElement,
                          viewer: HTMLDivElement,
                          viewerContainer: HTMLDivElement) => {
  const self = editorContainer

  if (!self.matches(':hover')) return

  const scrollTop = (event?.target as HTMLElement).scrollTop
  const scrollHeight = (event?.target as HTMLElement).scrollHeight
  const clientHeight = (event?.target as HTMLElement).clientHeight

  computedPosition(editorView, viewer, getTreeData())

  if (scrollTop === 0) {
    viewerContainer.scrollTop = 0
    return
  }
  
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

export const forViewer = (editorView: EditorView,
                          editorContainer: HTMLDivElement,
                          viewer: HTMLDivElement,
                          viewerContainer: HTMLDivElement) => {
  if (viewerContainer.scrollTop === 0) {
    editorContainer.scrollTop = 0
    return
  }

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
}
