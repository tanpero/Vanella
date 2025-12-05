import { parseMarkdown } from './markdown'
import { EditorState as CMState } from '@codemirror/state'
// import { EditorView as CMView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { mapLanguage } from '@/modes/shared/codemirrorConfig'
import { useEditorStore } from '@/stores/editorStore'

type MermaidLib = {
  initialize: (opts: { startOnLoad?: boolean; theme?: string }) => void | Promise<void>
  render: (id: string, code: string) => Promise<string | { svg: string }>
}

type AbcjsLib = {
  renderAbc: (el: HTMLElement, src: string, opts?: unknown) => unknown
}

async function prerenderDiagrams(html: string): Promise<string> {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  const dark = useEditorStore.getState().config.theme === 'dark'


  const mermaidEls = Array.from(wrapper.querySelectorAll('.mermaid')) as HTMLElement[]
  if (mermaidEls.length) {
    try {
      const mermaidMod: unknown = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')
      const mermaid: MermaidLib = (mermaidMod as { default?: MermaidLib }).default || (mermaidMod as MermaidLib)
      mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default' })
      let idx = 0
      for (const el of mermaidEls) {
        const code = (el.textContent || '').trim()
        try {
          const rendered = await mermaid.render(`m${idx++}`, code)
          const svg = typeof rendered === 'string' ? rendered : (rendered as { svg?: string }).svg || ''
          el.innerHTML = svg || ''
        } catch {
          const pre = document.createElement('pre')
          pre.textContent = code
          el.innerHTML = ''
          el.appendChild(pre)
        }
      }
    } catch { console.warn('mermaid pre-render failed') }
  }

  const abcEls = Array.from(wrapper.querySelectorAll('.abc-block')) as HTMLElement[]
  if (abcEls.length) {
    try {
      const ABCJSMod: unknown = await import(/* @vite-ignore */ 'https://esm.sh/abcjs@6.2.0?min')
      const ABCJS: AbcjsLib = (ABCJSMod as { default?: AbcjsLib }).default || (ABCJSMod as AbcjsLib)
      for (const el of abcEls) {
        const src = el.getAttribute('data-src') || ''
        const temp = document.createElement('div')
        temp.style.display = 'block'
        try {
          ABCJS.renderAbc(temp, src, { responsive: 'resize', staffwidth: 760 })
          const svgs = Array.from(temp.querySelectorAll('svg')) as SVGElement[]
          svgs.forEach(svg => {
            const vb = svg.getAttribute('viewBox') || ''
            const m = /\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*/.exec(vb)
            const w = m ? parseFloat(m[1]) : NaN
            const h = m ? parseFloat(m[2]) : NaN
            svg.style.display = 'block'
            svg.style.width = '100%'
            if (!Number.isNaN(w) && !Number.isNaN(h) && w > 0 && h > 0) {
              svg.style.aspectRatio = `${w} / ${h}`
            }
            svg.style.maxWidth = '100%'
            svg.style.position = 'static'
          })
          el.innerHTML = temp.innerHTML
          el.removeAttribute('data-src')
        } catch {
          const pre = document.createElement('pre')
          pre.textContent = src
          el.innerHTML = ''
          el.appendChild(pre)
        }
      }
    } catch { console.warn('abcjs pre-render failed') }
  }

  return wrapper.innerHTML
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function renderCodeBlockWithCM(lang: string, src: string): Promise<{ html: string }> {
  const langExt = mapLanguage(lang)
  const state = CMState.create({ doc: src, extensions: Array.isArray(langExt) ? langExt : [langExt] })
  const tree = syntaxTree(state)
  const mod = await import(/* @vite-ignore */ 'https://esm.sh/@lezer/highlight@1.2.0?min')
  const highlightTree: (t: unknown, h: unknown, cb: (from: number, to: number, cls: string) => void) => void = (mod as { highlightTree: (t: unknown, h: unknown, cb: (from: number, to: number, cls: string) => void) => void }).highlightTree
  const classHighlighter: unknown = (mod as { classHighlighter: unknown }).classHighlighter
  const tokens: { text: string; cls?: string }[] = []
  let index = 0
  highlightTree(tree, classHighlighter, (from, to, classes) => {
    if (from > index) tokens.push({ text: src.slice(index, from) })
    tokens.push({ text: src.slice(from, to), cls: classes || undefined })
    index = to
  })
  if (index < src.length) tokens.push({ text: src.slice(index) })
  const tabSize = useEditorStore.getState().config.tabSize || 4
  const lines: string[] = []
  let current = ''
  for (const t of tokens) {
    const parts = t.text.split('\n')
    for (let i = 0; i < parts.length; i++) {
      const piece = escapeHtml(parts[i])
      if (t.cls) current += `<span class="${t.cls}">${piece}</span>`
      else current += piece
      if (i < parts.length - 1) { lines.push(current || '<br>'); current = '' }
    }
  }
  if (current.length > 0) lines.push(current)
  const contentHtml = lines.map(l => `<div class="cm-line">${l}</div>`).join('')
  const html = `<div class="cm-editor"><div class="cm-scroller"><div class="cm-content" data-language="${lang}" style="tab-size:${tabSize}">${contentHtml}</div></div></div>`
  return { html }
}

async function prerenderCodeBlocks(html: string): Promise<{ html: string; cmCss: string }> {
  const { config } = useEditorStore.getState()
  const dark = config.theme === 'dark'
  const container = document.createElement('div')
  container.innerHTML = html
  const cssParts: string[] = []
  const blocks = Array.from(container.querySelectorAll('pre > code')) as HTMLElement[]
  for (const code of blocks) {
    const pre = code.parentElement as HTMLElement
    const cls = code.getAttribute('class') || ''
    const m = /language-([\w+#-]+)/.exec(cls)
    const lang = m ? m[1] : ''
    const src = code.textContent || ''
    const { html: cmHtml } = await renderCodeBlockWithCM(lang, src)
    const lines = src.split('\n').length
    const gutter = Array.from({ length: lines }, (_, i) => `<div>${i + 1}</div>`).join('')
    const wrap = document.createElement('div')
    wrap.className = `pm-codeblock-cm ${dark ? 'dark' : 'light'}`
    wrap.innerHTML = `<div class="pm-code-gutter">${gutter}</div>${cmHtml}`
    pre.replaceWith(wrap)
  }
  const baseCss = `
.pm-codeblock-cm { border: 1px solid ${dark ? '#374151' : '#e5e7eb'}; border-radius: 6px; overflow: hidden; margin: 8px 0; position: relative; display: grid; grid-template-columns: 36px 1fr; }
.pm-codeblock-cm .cm-editor { background: ${dark ? '#0b1220' : '#ffffff'}; color: ${dark ? '#e5e7eb' : '#111827'}; }
.pm-code-gutter { width: 36px; background: ${dark ? '#0b1220' : '#f3f4f6'}; color: #9ca3af; padding: 6px 6px 6px 8px; box-sizing: border-box; text-align: right; font-family: Consolas, Monaco, monospace; font-size: 12px; line-height: 1.6; user-select: none; pointer-events: none; }
.pm-codeblock-cm .cm-content { padding: 8px; }
.pm-codeblock-cm .cm-scroller { overflow: auto; }
.pm-codeblock-cm .cm-line { white-space: pre; }
.pm-codeblock-cm .cm-scroller, .pm-codeblock-cm .cm-content, .pm-codeblock-cm .cm-line { font-family: Consolas, Monaco, monospace; font-size: 14px; }
`
  const tokenCss = `
.pm-codeblock-cm .tok-comment { color: ${dark ? '#9ca3af' : '#6b7280'}; font-style: italic; }
.pm-codeblock-cm .tok-keyword { color: ${dark ? '#93c5fd' : '#2563eb'}; font-weight: 600; }
.pm-codeblock-cm .tok-operator { color: ${dark ? '#e5e7eb' : '#111827'}; }
.pm-codeblock-cm .tok-string { color: ${dark ? '#86efac' : '#22c55e'}; }
.pm-codeblock-cm .tok-number { color: ${dark ? '#fbbf24' : '#f59e0b'}; }
.pm-codeblock-cm .tok-bool { color: ${dark ? '#fbbf24' : '#f59e0b'}; }
.pm-codeblock-cm .tok-tagName { color: ${dark ? '#a78bfa' : '#7c3aed'}; }
.pm-codeblock-cm .tok-attributeName { color: ${dark ? '#f472b6' : '#db2777'}; }
.pm-codeblock-cm .tok-className { color: ${dark ? '#f472b6' : '#db2777'}; }
.pm-codeblock-cm .tok-propertyName { color: ${dark ? '#60a5fa' : '#1d4ed8'}; }
.pm-codeblock-cm .tok-variableName { color: ${dark ? '#e5e7eb' : '#111827'}; }
.pm-codeblock-cm .tok-function { color: ${dark ? '#a78bfa' : '#7c3aed'}; }
.pm-codeblock-cm .tok-typeName { color: ${dark ? '#93c5fd' : '#2563eb'}; }
.pm-codeblock-cm .tok-namespace { color: ${dark ? '#60a5fa' : '#1d4ed8'}; }
.pm-codeblock-cm .tok-punctuation { color: ${dark ? '#e5e7eb' : '#111827'}; }
.pm-codeblock-cm .tok-invalid { color: #dc2626; text-decoration: underline wavy; }
`
  const scopedThemeCss = cssParts.join('\n')
  const cmCss = scopedThemeCss ? `${baseCss}\n${tokenCss}\n${scopedThemeCss}` : `${baseCss}\n${tokenCss}`
  return { html: container.innerHTML, cmCss }
}

export const exportToHTML = async (content: string, title: string = 'Markdown Document'): Promise<string> => {
  const rawHtmlContent = parseMarkdown(content)
  const afterDiagrams = await prerenderDiagrams(rawHtmlContent)
  const { html: htmlContent, cmCss } = await prerenderCodeBlocks(afterDiagrams)
  const { config } = useEditorStore.getState()
  const dark = config.theme === 'dark'
  const bodyBg = dark ? '#0b1220' : '#ffffff'
  const bodyColor = dark ? '#e5e7eb' : '#333333'
  const headingBorder1 = dark ? '#1f2937' : '#e5e7eb'
  const headingBorder2 = dark ? '#1f2937' : '#e5e7eb'
  const inlineCodeBg = dark ? '#111827' : '#f3f4f6'
  const inlineCodeColor = dark ? '#e5e7eb' : '#111827'
  const preBg = dark ? '#0b1220' : '#f8f9fa'
  const preColor = dark ? '#e5e7eb' : '#1f2937'
  const preBorder = dark ? '#1f2937' : '#e5e7eb'
  const blockquoteBorder = dark ? '#374151' : '#dddddd'
  const blockquoteColor = dark ? '#9ca3af' : '#666666'
  const tableBorder = dark ? '#374151' : '#dddddd'
  const thBg = dark ? '#111827' : '#f5f5f5'
  const linkColor = dark ? '#93c5fd' : '#0366d6'
  
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
            color: ${bodyColor};
            background-color: ${bodyBg};
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        h1 { font-size: 2rem; border-bottom: 2px solid ${headingBorder2}; padding-bottom: 0.3rem; }
        h2 { font-size: 1.5rem; border-bottom: 1px solid ${headingBorder1}; padding-bottom: 0.25rem; }
        h3 { font-size: 1.25rem; }
        h4 { font-size: 1rem; }
        h5 { font-size: 0.875rem; }
        h6 { font-size: 0.75rem; color: ${blockquoteColor}; }
        p { margin: 0.5rem 0; }
        code {
            background-color: ${inlineCodeBg};
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: Consolas, Monaco, monospace;
            font-size: 0.9em;
            color: ${inlineCodeColor};
        }
        pre {
            background-color: ${preBg};
            color: ${preColor};
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid ${preBorder};
        }
        pre code {
            background-color: transparent;
            padding: 0;
            border-radius: 0;
        }
        blockquote {
            border-left: 4px solid ${blockquoteBorder};
            margin: 0;
            padding-left: 1rem;
            color: ${blockquoteColor};
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
        }
        th, td {
            border: 1px solid ${tableBorder};
            padding: 0.5rem;
            text-align: left;
        }
        th {
            background-color: ${thBg};
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
            color: ${linkColor};
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
            border-top: 1px solid ${headingBorder1};
            margin: 2rem 0;
        }
        .pm-toc-block ul { list-style: none; padding-left: 0; }
        .pm-toc-block li { margin: 0.25rem 0; }
        .pm-toc-block li[data-depth="2"] { margin-left: 12px; }
        .pm-toc-block li[data-depth="3"] { margin-left: 24px; }
        .pm-toc-block li[data-depth="4"] { margin-left: 36px; }
        .pm-toc-block li[data-depth="5"] { margin-left: 48px; }
        .pm-toc-block li[data-depth="6"] { margin-left: 60px; }
        .abc-block { display: block; margin: .5rem 0; position: relative; overflow: hidden; }
        .abcjs-svg { max-width: 100%; height: auto; display: block; }
        .mermaid { text-align: center; }
${cmCss}
    </style>
    <script>
      window.MathJax = {
        tex: { inlineMath: [['$', '$']], displayMath: [['$$','$$'], ['\\[','\\]']] },
        svg: { fontCache: 'global' }
      }
    </script>
    <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>
    ${htmlContent}
</body>
</html>`
}

export const exportToPDF = async (content: string, title: string = 'Markdown Document'): Promise<Blob> => {
  const htmlContent = await exportToHTML(content, title)
  
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

export const exportHTML = async (content: string, filename: string = 'document.html') => {
  const htmlContent = await exportToHTML(content)
  downloadFile(htmlContent, filename, 'text/html')
}
