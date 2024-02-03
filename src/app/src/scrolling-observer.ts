import { Node as Node } from 'unified/lib'

let treeData: Node

export const getTreeData = () => treeData

export const scrollingObserver = () => (tree, file) => {
  treeData = tree
}
