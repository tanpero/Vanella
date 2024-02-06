import { joinPath, resolvePath } from "./text-tools"

const isLocalPath = url =>
  // 判断是否为本地路径
  !/^https?:\/\//i.test(url)

const isMarkdownFile = (url) => /\.(md|markdown|txt)$/i.test(url)

export const handleLocalPath = options => {
  const { getDirectory, rootDirectory } = options

  const processLink = node => {
    if (!node.properties.href) return

    const url = node.properties.href
    let absoluteUrl

    if (isLocalPath(url)) {
      // 处理相对路径
      const parentDirectory = getDirectory()
      const absolutePath = resolvePath(parentDirectory, url)

      absoluteUrl = absolutePath
    } else {
      absoluteUrl = url
    }

    if (isMarkdownFile(url)) {
      // 若为 markdown 文件，覆写单击事件
      node.properties.onClick = `vanella.openFile('${absoluteUrl}')`
    } else {
      // 否则加上根目录前缀
      node.properties.href = absoluteUrl
    }
  }

  const processMedia = node => {
    if (!node.properties.src) return

    const url = node.properties.src
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
  }

  return tree => {
    tree.children.forEach(node => {
      if (node.tagName === 'a') {
        processLink(node)
      } else if (['img', 'video', 'audio'].includes(node.tagName)) {
        processMedia(node)
      }
    })
  }
}
