import { toc } from 'mdast-util-toc'
import { List } from 'mdast-util-toc/lib'

export default (depth: 1 | 2 | 3 | 4 | 5 | 6) => {
  return () => (tree, file) => {

    // 查找 [toc] 或 [TOC] 标记
    const tocNode = tree.children.find(
      (node) =>
        node.type === 'paragraph' &&
        node.children.length === 1 &&
        node.children[0].type === 'text' &&
        /^(?:\[?\[[Tt][Oo][Cc]\]\]?|目录)$/.test(node.children[0].value)
    )

    if (tocNode) {
     
      // 检查是否存在标题节点
      const hasHeadings = tree.children.some((node) => /^heading/.test(node.type))

      // 如果不存在标题节点，则创建一个空的 ul 节点
      if (!hasHeadings) {
        tree.children.push({
          type: 'list',
          ordered: false,
          start: null,
          loose: false,
          children: [],
        })
        return
      }

      // 生成目录
      const generatedToc = toc(tree, { maxDepth: depth }).map as List

      // 包裹最外层的 li 在 ul 中
      const ulNode = {
        type: 'list',
        ordered: false,
        start: null,
        loose: false,
        children: generatedToc.children,
      }

      // 替换 [toc] 或 [TOC] 节点为包含 ul 的节点
      const index = tree.children.indexOf(tocNode)
      tree.children.splice(index, 1, ulNode)
    }
  }
}
