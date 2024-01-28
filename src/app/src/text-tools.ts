export const extractFileName = (filePath: string): string => {
    const regex = /(?:.*[\/\\])?([^\/\\]+)(?:\.[^\/\\]+)?$/

    const match = filePath.match(regex)

    if (match && match[1]) {
        return match[1]
    } else {
        return ''
    }
}
