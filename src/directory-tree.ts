import * as fs from 'fs'
import * as path from 'path'

interface TreeNode {
  id: number
  name: string
  parentId: number | null
  fileCount: number
  children?: TreeNode[]
}

function isHidden(filePath: string): boolean {
  const stats = fs.statSync(filePath);
  return (stats.mode & 0o777) === 0; // Check if file has no permissions, i.e., it's hidden
}

const generateDirectoryTree = (directoryPath: string, parentId: number | null = null): TreeNode => {
  const contents = fs.readdirSync(directoryPath);
  let fileCount = 0;

  const children: TreeNode[] = contents
    .filter((content) => !content.startsWith('.') && !isHidden(path.join(directoryPath, content)))
    .map((content, index) => {
      const fullPath = path.join(directoryPath, content);
      const stats = fs.statSync(fullPath);

      const node: TreeNode = {
        id: index + 1,
        name: content,
        parentId: parentId,
        fileCount: 0,
      };

      if (stats.isDirectory()) {
        // If it's a directory, recursively generate the tree for its contents
        const subTree = generateDirectoryTree(fullPath, node.id);
        node.children = subTree.children;
        node.fileCount = subTree.fileCount;
      } else {
        // If it's a file, update the file count
        node.fileCount = 1;
        fileCount++;
      }

      return node;
    })
    .sort((a, b) => {
      // Sort by directories first, then files, in alphabetical order
      if (a.children && !b.children) return -1; // a is a directory, b is a file
      if (!a.children && b.children) return 1; // b is a directory, a is a file
      return a.name.localeCompare(b.name);
    });

  const tree: TreeNode = {
    id: parentId !== null ? parentId : 1,
    name: path.basename(directoryPath),
    parentId: parentId,
    fileCount: fileCount,
    children: children,
  };

  return tree;
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




export const generateCurrentDirectoryTree = filePath => generateDirectoryTree(path.dirname(filePath))
export { generateDirectoryTreeView }
