import { resolvePath } from "./text-tools"

export const isLocalPath = url =>
  // 判断是否为本地路径
  /^(\.\/|\.\.\/)/.test(url) ||
      !/^https?:\/\//i.test(url) &&
      !/^(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+)(:\d{1,5})?/.test(url)

const isMarkdownFile = url => /\.(md|markdown|txt)$/i.test(url)

const isWithoutExtname = url => /^[^.\\/]*$/.test(url)

export const handleLocalPath = options => tree => {
  const { getDirectory } = options
  const traverse = node => {
    if (node.type === 'element') {
      switch (node.tagName) {
        case 'a': {
          let url = node.properties.href
          if (isLocalPath(url)) {
            const parentDirectory = getDirectory()
            const absolutePath = resolvePath(parentDirectory, url)
            if (isMarkdownFile(url)) {
              node.properties = {
                ...node.properties,
                onClick: `switchFile('${absolutePath.replaceAll('\\', '\\\\')}')`,
              }
              node.properties.href = void 0
            } else if (isWithoutExtname(url)) {              
              node.properties = {
                ...node.properties,
                onClick: `switchFile('${absolutePath.replaceAll('\\', '\\\\') + '.md'}')`,
              }
              node.properties.href = void 0
            }
          }
        }
        break
        case 'img': case 'video': case 'audio': {
          let url = node.properties.src
          let absoluteUrl

          if (isLocalPath(url)) {
            // 处理相对路径
            const parentDirectory = getDirectory()
            const absolutePath = resolvePath(parentDirectory, url)

            absoluteUrl = absolutePath
          } else {
            absoluteUrl = url
          }

          // 替换为绝对路径
          node.properties.src = absoluteUrl
          break
        }
        default: {
          node.children.forEach(traverse)
        }
      }
    }
  }
  tree.children.forEach(traverse)
  return tree
}
