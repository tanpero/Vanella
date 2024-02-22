import mime from 'mime'
import { visit } from 'unist-util-visit'
import { extractExtName, resolvePath } from './text-tools'
import { isLocalPath } from './handle-local-path'

declare let vanella: any

export default options => async (tree, file) => {
  const { getDirectory } = options
  const nodes = []
  const paths = []
  
  visit(tree, 'image', node => {
    if (isLocalPath(node.url)) {
      const parentDirectory = getDirectory()
      const filePath = resolvePath(parentDirectory, node.url)
      const mimeName = mime.getType(extractExtName(filePath))
      if (mimeName) {
        nodes.push([node, mimeName])
        paths.push(filePath)
      }
    }
  })

  const promises = paths.map(async filePath => await vanella.readFileAsBase64(filePath))

  const results = await Promise.all(promises)
  let index = -1
  while (++index < results.length) {
    const [node, mime] = nodes[index]
    const result = results[index]
    node.url = 'data:' + mime + ';base64,' + result
  }
}

