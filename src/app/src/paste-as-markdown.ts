import TurndownService from 'turndown'

const turndownService = new TurndownService()

const convertHtmlToMarkdown = (html: string): string => {
    return turndownService.turndown(html)
}

const handlePasteEvent = (event: ClipboardEvent) => {
    event.preventDefault()

    const clipboardData = event.clipboardData
    if (!clipboardData) return

    const types = clipboardData.types
    if (types.includes('text/plain')) {
      
      // TODO...
      // Now follow the default behaviour...

    } else if (types.includes('text/html')) {
        const htmlData = clipboardData.getData('text/html')
        const markdownContent = convertHtmlToMarkdown(htmlData)
        insertContent(markdownContent)
    } else if (types.includes('image/png') || types.includes('image/jpeg')) {
        const file = clipboardData.items[0].getAsFile()
        console.log(file)
        if (!file) return

        const reader = new FileReader()
        reader.onload = () => {
            const dataURL = reader.result as string
            const markdownContent = `![Image](data:${file.type}base64,${dataURL.split(',')[1]})`
            insertContent(markdownContent)
        }
        reader.readAsDataURL(file)
    } else {
        const url = clipboardData.getData('text/plain')
        const markdownContent = url.startsWith('http') ? `[${url || 'URL'}](${url})` : url
        insertContent(markdownContent)
    }
}

const insertContent = (content: string) => {
    const selection = window.getSelection()
    if (!selection) return

    const range = selection.getRangeAt(0)
    range.deleteContents()
    const contentNode = document.createTextNode(content)
    range.insertNode(contentNode)
}

export const pasteHTMLAsMarkdown = (editor: HTMLElement) => {
    editor.addEventListener('paste', handlePasteEvent)
}
