import { parseMarkdown } from './markdown'

export const exportToHTML = (content: string, title: string = 'Markdown Document'): string => {
  const htmlContent = parseMarkdown(content)
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #333;
            background-color: #fff;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        h1 { font-size: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.3rem; }
        h2 { font-size: 1.5rem; }
        h3 { font-size: 1.25rem; }
        h4 { font-size: 1rem; }
        h5 { font-size: 0.875rem; }
        h6 { font-size: 0.75rem; color: #666; }
        p { margin: 0.5rem 0; }
        code {
            background-color: #f4f4f4;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
        }
        pre {
            background-color: #f8f8f8;
            padding: 1rem;
            border-radius: 5px;
            overflow-x: auto;
            border: 1px solid #e1e1e1;
        }
        pre code {
            background-color: transparent;
            padding: 0;
            border-radius: 0;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 0;
            padding-left: 1rem;
            color: #666;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 0.5rem;
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
            font-weight: 600;
        }
        ul, ol {
            margin: 0.5rem 0;
            padding-left: 2rem;
        }
        li {
            margin: 0.25rem 0;
        }
        a {
            color: #0366d6;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 5px;
        }
        hr {
            border: none;
            border-top: 1px solid #eee;
            margin: 2rem 0;
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`
}

export const exportToPDF = async (content: string, title: string = 'Markdown Document'): Promise<Blob> => {
  const htmlContent = exportToHTML(content, title)
  
  // Create a new window with the HTML content
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) {
    throw new Error('Failed to open print window')
  }
  
  printWindow.document.write(htmlContent)
  printWindow.document.close()
  
  // Wait for the content to load, then trigger print
  setTimeout(() => {
    printWindow.print()
    // Close the window after printing (user can cancel)
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.close()
      }
    }, 1000)
  }, 500)
  
  // Return a placeholder blob (actual PDF generation would require a library)
  return new Blob([htmlContent], { type: 'text/html' })
}

export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportMarkdown = (content: string, filename: string = 'document.md') => {
  downloadFile(content, filename, 'text/markdown')
}

export const exportHTML = (content: string, filename: string = 'document.html') => {
  const htmlContent = exportToHTML(content)
  downloadFile(htmlContent, filename, 'text/html')
}
