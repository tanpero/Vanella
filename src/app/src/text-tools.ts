export const extractFileName = (filePath: string): string => {
  const regex = /(?:.*[\/\\])?([^\/\\]+)(?:\.[^\/\\]+)?$/

  const match = filePath.match(regex)

  if (match && match[1]) {
      return match[1]
  } else {
      return ''
  }
}

export const resolvePath = (...paths: string[]): string => {
  const isWindows = navigator.appVersion.includes('Win')
  const separator = isWindows ? '\\' : '/'
  
  let resolvedPath = paths.join(separator)

  // Normalize separators based on the platform
  if (isWindows) {
    // Convert forward slashes to backslashes
    resolvedPath = resolvedPath.replace(/\//g, '\\')
  } else {
    // Convert backslashes to forward slashes
    resolvedPath = resolvedPath.replace(/\\/g, '/')
  }

  // Handle '..' and '.' in the path
  const parts = resolvedPath.split(separator)
  const resolvedParts: string[] = []

  for (const part of parts) {
    if (part === '..') {
      resolvedParts.pop()
    } else if (part !== '' && part !== '.') {
      resolvedParts.push(part)
    }
  }

  resolvedPath = resolvedParts.join(separator)

  // Add root slash for Unix-like systems if the path is absolute
  if (!isWindows && paths.length > 0 && paths[0].startsWith('/')) {
    resolvedPath = '/' + resolvedPath
  }

  return resolvedPath
}

export const joinPath = (...paths: string[]): string => {
  const isWindows = navigator.appName.includes('Win')
  const separator = isWindows ? '\\' : '/'

  // Filter out empty paths and normalize separators
  const normalizedPaths = paths.filter(path => !!path).map(path => {
    // Convert separators to the platform-specific one
    if (isWindows) {
      return path.replace(/\//g, '\\')
    } else {
      return path.replace(/\\/g, '/')
    }
  })

  // Join paths with the platform-specific separator
  const joinedPath = normalizedPaths.join(separator)

  // Add a trailing slash if the last path does not end with a separator
  if (!joinedPath.endsWith(separator)) {
    return joinedPath + separator
  }

  return joinedPath
}

// Example usage
const joinedPath = joinPath('/root', 'dir1', 'dir2', 'file.txt')
console.log(joinedPath)

