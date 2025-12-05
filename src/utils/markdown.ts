import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { toString as mdastToString } from 'mdast-util-to-string'

export const parseMarkdown = (content: string): string => {
  const file = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .processSync(content)
  return String(file)
}

export const extractTextFromMarkdown = (content: string): string => {
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkBreaks).parse(content) as unknown as { type: string }
  return mdastToString(tree as { type: string })
}

export const getWordCount = (content: string): number => {
  const text = extractTextFromMarkdown(content)
  return text.split(/\s+/).filter(word => word.length > 0).length
}

export const getCharacterCount = (content: string): number => {
  return content.length
}

export const getLineCount = (content: string): number => {
  return content.split('\n').length
}

export const insertMarkdownSyntax = (
  content: string,
  selectionStart: number,
  selectionEnd: number,
  syntax: string,
  placeholder?: string
): { newContent: string; newCursorPos: number } => {
  const selectedText = content.slice(selectionStart, selectionEnd)
  const beforeSelection = content.slice(0, selectionStart)
  const afterSelection = content.slice(selectionEnd)
  
  let newText: string
  let cursorOffset: number
  
  switch (syntax) {
    case 'bold':
      newText = `**${selectedText || placeholder || 'bold text'}**`
      cursorOffset = selectedText ? 2 : 2 + (placeholder?.length || 9)
      break
    case 'italic':
      newText = `*${selectedText || placeholder || 'italic text'}*`
      cursorOffset = selectedText ? 1 : 1 + (placeholder?.length || 11)
      break
    case 'code':
      newText = `\`${selectedText || placeholder || 'code'}\``
      cursorOffset = selectedText ? 1 : 1 + (placeholder?.length || 4)
      break
    case 'link':
      newText = `[${selectedText || 'link text'}](url)`
      cursorOffset = selectedText ? selectedText.length + 3 : 12
      break
    case 'image':
      newText = `![${selectedText || 'alt text'}](image-url)`
      cursorOffset = selectedText ? selectedText.length + 4 : 18
      break
    case 'heading1':
      newText = `# ${selectedText || placeholder || 'Heading'}`
      cursorOffset = selectedText ? 2 : 2 + (placeholder?.length || 7)
      break
    case 'heading2':
      newText = `## ${selectedText || placeholder || 'Heading'}`
      cursorOffset = selectedText ? 3 : 3 + (placeholder?.length || 7)
      break
    case 'heading3':
      newText = `### ${selectedText || placeholder || 'Heading'}`
      cursorOffset = selectedText ? 4 : 4 + (placeholder?.length || 7)
      break
    case 'bullet':
      newText = `- ${selectedText || placeholder || 'List item'}`
      cursorOffset = selectedText ? 2 : 2 + (placeholder?.length || 9)
      break
    case 'number':
      newText = `1. ${selectedText || placeholder || 'List item'}`
      cursorOffset = selectedText ? 3 : 3 + (placeholder?.length || 9)
      break
    case 'quote':
      newText = `> ${selectedText || placeholder || 'Quote'}`
      cursorOffset = selectedText ? 2 : 2 + (placeholder?.length || 5)
      break
    default:
      newText = selectedText
      cursorOffset = 0
  }
  
  const newContent = beforeSelection + newText + afterSelection
  const newCursorPos = selectionStart + cursorOffset
  
  return { newContent, newCursorPos }
}

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9)
}
