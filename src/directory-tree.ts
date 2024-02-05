import * as fs from 'fs'
import * as path from 'path'
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'


interface TreeNode {
  id: number
  name: string
  parentId: number | null
  fileCount: number
  children?: TreeNode[]
}

function isHidden(filePath: string): boolean {
  const stats = fs.statSync(filePath)
  return (stats.mode & 0o777) === 0
}

const availableExt = ['md', 'markdown', 'txt']
function isAvailableFile(filePath: string): boolean {
  return availableExt.includes(path.extname(filePath.toLocaleLowerCase()))
}

const generateDirectoryTree = (directoryPath: string, parentId: number | null = null): Promise<TreeNode> => {
  return new Promise(async (resolve, reject) => {
    try {
      const contents = fs.readdirSync(directoryPath)
      let fileCount = 0

      const children: TreeNode[] = []
      const tasks = contents
        .filter(async (content) => {
          if (content.startsWith('.') || isHidden(path.join(directoryPath, content))) return false

          const fullPath = path.join(directoryPath, content)
          const stats = await fs.statSync(fullPath)
          if (stats.isDirectory()) return true
          return isAvailableFile(content)
        })
        .map(async (content, index) => {
          const fullPath = path.join(directoryPath, content)
          const stats = await fs.statSync(fullPath)

          const node: TreeNode = {
            id: index + 1,
            name: content,
            parentId: parentId,
            fileCount: 0,
          }

          if (stats.isDirectory()) {
            // If it's a directory, recursively generate the tree for its contents
            const subTree = await generateDirectoryTree(fullPath, node.id)
            node.children = subTree.children
            node.fileCount = subTree.fileCount
          } else {
            // If it's a file, update the file count
            node.fileCount = 1
            fileCount++
          }

          return node
        })

      for (const task of tasks) {
        children.push(await task)
      }

      const sortedChildren = children.sort((a, b) => {
        // Sort by directories first, then files, in alphabetical order
        if (a.children && !b.children) return -1 // a is a directory, b is a file
        if (!a.children && b.children) return 1 // b is a directory, a is a file
        return a.name.localeCompare(b.name)
      })

      const tree: TreeNode = {
        id: parentId !== null ? parentId : 1,
        name: path.basename(directoryPath),
        parentId: parentId,
        fileCount: fileCount,
        children: children,
      }

      resolve(tree)
    } catch (error) {
      reject(error)
    }
  })
}

const generateDirectoryTreeView = childs => {
  let html = ''
  childs.forEach(el => {
    html += `<details>\n<summary><span class="tree-item" title="${
      el.name
    }" data-id="${
      el.id
    }">${
      el.name
    }</span></summary>`

    if (el.children && el.children.length) {
      html += generateDirectoryTreeView(el.children) // 如果有chidren就继续遍历
    }
    html += `</details>`
  })

  return html
}


export const generateCurrentDirectoryTree = async filePath => await generateDirectoryTree(path.dirname(filePath))
export { generateDirectoryTreeView }
