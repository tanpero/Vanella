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
      const mermaidUrl = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
      const mermaidMod: unknown = await import(/* @vite-ignore */ mermaidUrl as any)
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
      const abcUrl = 'https://esm.sh/abcjs@6.2.0?min'
      const ABCJSMod: unknown = await import(/* @vite-ignore */ abcUrl as any)
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
  const lezerUrl = 'https://esm.sh/@lezer/highlight@1.2.0?min'
  const mod = await import(/* @vite-ignore */ lezerUrl as any)
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

function splitMarkdownToSlideStacks(md: string): string[][] {
  const lines = md.split(/\r?\n/)
  const stacks: string[][] = []
  let currentStack: string[] = []
  let currentSlide: string[] = []
  const flushSlide = () => {
    const body = currentSlide.join('\n').trim()
    currentSlide = []
    if (body.length === 0) return
    currentStack.push(body)
  }
  const flushStack = () => {
    flushSlide()
    if (currentStack.length === 0) return
    stacks.push(currentStack)
    currentStack = []
  }
  for (const ln of lines) {
    if (/^\s*---\s*$/.test(ln)) { flushStack(); continue }
    if (/^\s*--\s*$/.test(ln)) { flushSlide(); continue }
    currentSlide.push(ln)
  }
  flushStack()
  return stacks.length ? stacks : [[md]]
}

 

type Block = { kind: 'heading'|'paragraph'|'code'|'image'|'list'|'blockquote'|'math'|'hr'|'toc'; level?: number; text: string }

function tokenizeBlocks(md: string): Block[] {
  const lines = md.split(/\r?\n/)
  const blocks: Block[] = []
  let i = 0
  let buf: string[] = []
  const flushPara = () => {
    const t = buf.join('\n').trim()
    buf = []
    if (!t) return
    blocks.push({ kind: 'paragraph', text: t })
  }
  let inCode = false
  let codeLang = ''
  let codeBuf: string[] = []
  let inMath = false
  let mathBuf: string[] = []
  let listBuf: string[] = []
  let inList = false
  let quoteBuf: string[] = []
  let inQuote = false
  while (i < lines.length) {
    const ln = lines[i]
    const lnTrim = (ln || '').trim().toLowerCase()
    if (lnTrim === '[toc]') {
      flushPara()
      blocks.push({ kind: 'toc', text: '[toc]' })
      i++
      continue
    }
    if (!inCode && /^\s*```/.test(ln)) {
      flushPara()
      inCode = true
      codeLang = ln.replace(/^\s*```\s*/, '')
      codeBuf = []
      i++
      continue
    }
    if (inCode) {
      if (/^\s*```\s*$/.test(ln)) {
        blocks.push({ kind: 'code', text: '```' + codeLang + '\n' + codeBuf.join('\n') + '\n```' })
        inCode = false
        codeLang = ''
        codeBuf = []
        i++
        continue
      }
      codeBuf.push(ln)
      i++
      continue
    }
    if (!inMath && /^\s*\$\$\s*$/.test(ln)) {
      flushPara()
      inMath = true
      mathBuf = ['$$']
      i++
      continue
    }
    if (inMath) {
      mathBuf.push(ln)
      if (/^\s*\$\$\s*$/.test(ln)) {
        blocks.push({ kind: 'math', text: mathBuf.join('\n') })
        inMath = false
        mathBuf = []
      }
      i++
      continue
    }
    if (!inList && /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(ln)) {
      flushPara()
      inList = true
      listBuf = [ln]
      i++
      continue
    }
    if (inList) {
      if (/^\s*(?:[-*+]\s+|\d+\.\s+)/.test(ln)) {
        listBuf.push(ln)
        i++
        continue
      }
      blocks.push({ kind: 'list', text: listBuf.join('\n') })
      inList = false
      listBuf = []
      continue
    }
    if (!inQuote && /^\s*>\s?/.test(ln)) {
      flushPara()
      inQuote = true
      quoteBuf = [ln]
      i++
      continue
    }
    if (inQuote) {
      if (/^\s*>\s?/.test(ln)) {
        quoteBuf.push(ln)
        i++
        continue
      }
      blocks.push({ kind: 'blockquote', text: quoteBuf.join('\n') })
      inQuote = false
      quoteBuf = []
      continue
    }
    if (/^\s*---\s*$/.test(ln)) {
      flushPara()
      blocks.push({ kind: 'hr', text: ln })
      i++
      continue
    }
    const h = /^(\s*#{1,6})\s+(.*)$/.exec(ln)
    if (h) {
      flushPara()
      const level = h[1].trim().length
      blocks.push({ kind: 'heading', level, text: ln })
      i++
      continue
    }
    const img = /^\s*!\[[^\]]*\]\([^)]*\)\s*$/.test(ln)
    if (img) {
      flushPara()
      blocks.push({ kind: 'image', text: ln })
      i++
      continue
    }
    if (/^\s*$/.test(ln)) {
      flushPara()
      i++
      continue
    }
    buf.push(ln)
    i++
  }
  flushPara()
  if (inList && listBuf.length) blocks.push({ kind: 'list', text: listBuf.join('\n') })
  if (inQuote && quoteBuf.length) blocks.push({ kind: 'blockquote', text: quoteBuf.join('\n') })
  return blocks
}

function textPoints(t: string): number {
  const len = t.length
  return Math.max(1, Math.ceil(len / 800))
}

function blockPoints(b: Block): number {
  if (b.kind === 'image') return 6
  if (b.kind === 'code') return Math.max(2, Math.ceil(b.text.split('\n').length / 14))
  if (b.kind === 'list') return Math.max(1, Math.ceil(b.text.split('\n').length / 20))
  if (b.kind === 'blockquote') return textPoints(b.text)
  if (b.kind === 'math') return 6
  if (b.kind === 'paragraph') return textPoints(b.text)
  return 1
}

function splitParagraphByLength(t: string, maxChars: number): string[] {
  const parts: string[] = []
  let current = ''
  const push = () => { if (current.trim().length) { parts.push(current.trim()); current = '' } }
  const sentences = t.split(/(?<=\.|!|\?|。|！|？)\s+/)
  for (const s of sentences) {
    if ((current + ' ' + s).trim().length > maxChars) push()
    current = current.length ? current + ' ' + s : s
  }
  push()
  return parts.length ? parts : [t]
}

function packBlocksIntoSlides(blocks: Block[], firstSlidePrefix: string | null): string[] {
  const slides: string[] = []
  const MAX_POINTS = 18
  let acc: Block[] = []
  let pts = 0
  const flush = () => {
    if (!acc.length) return
    const md = acc.map(b => b.text).join('\n\n').trim()
    slides.push(md)
    acc = []
    pts = 0
  }
  let prefixUsed = false
  for (let idx = 0; idx < blocks.length; idx++) {
    const b = blocks[idx]
    if (b.kind === 'paragraph') {
      const big = splitParagraphByLength(b.text, 900)
      for (const piece of big) {
        const pb: Block = { kind: 'paragraph', text: piece }
        const p = blockPoints(pb)
        if (pts + p > MAX_POINTS) flush()
        if (!prefixUsed && firstSlidePrefix) {
          acc.push({ kind: 'paragraph', text: firstSlidePrefix + '\n\n' + pb.text })
          prefixUsed = true
        } else {
          acc.push(pb)
        }
        pts += p
      }
      continue
    }
    const p = blockPoints(b)
    if (pts + p > MAX_POINTS) flush()
    if (!prefixUsed && firstSlidePrefix) {
      acc.push({ kind: b.kind, level: b.level, text: firstSlidePrefix + '\n\n' + b.text })
      prefixUsed = true
    } else {
      acc.push(b)
    }
    pts += p
  }
  flush()
  return slides
}

function paginateAdvanced(md: string): string[][] {
  const blocks = tokenizeBlocks(md)
  const stacks: string[][] = []
  let currentStack: string[] = []
  const flushStack = () => { if (currentStack.length) { stacks.push(currentStack); currentStack = [] } }
  let j = 0
  while (j < blocks.length) {
    const b = blocks[j]
    if (b.kind === 'toc') {
      currentStack.push('::PM_TOC_OVERVIEW::')
      j++
      continue
    }
    if (b.kind === 'heading' && (b.level || 1) === 1) {
      flushStack()
      currentStack.push(b.text)
      j++
      const seg: Block[] = []
      while (j < blocks.length) {
        const nb = blocks[j]
        if (nb.kind === 'toc') {
          if (seg.length) {
            const slides = packBlocksIntoSlides(seg, null)
            currentStack.push(...slides)
            seg.length = 0
          }
          currentStack.push('::PM_TOC_OVERVIEW::')
          j++
          continue
        }
        if (nb.kind === 'heading' && (nb.level || 1) === 1) break
        if (nb.kind === 'heading' && (nb.level || 1) === 2) {
          if (seg.length) {
            const slides = packBlocksIntoSlides(seg, null)
            currentStack.push(...slides)
            seg.length = 0
          }
          currentStack.push(nb.text)
          j++
          const afterH2: Block[] = []
          while (j < blocks.length) {
            const tb = blocks[j]
            if (tb.kind === 'heading' && (tb.level || 1) <= 2) break
            if (tb.kind === 'toc') {
              // Flush anything accumulated before TOC inside H2 segment
              if (afterH2.length) {
                // Process inner H3 segmentation within H2 segment before TOC
                let k = 0
                let pending: Block[] = []
                const flushPending = () => {
                  if (pending.length) {
                    const slides = packBlocksIntoSlides(pending, null)
                    currentStack.push(...slides)
                    pending = []
                  }
                }
                while (k < afterH2.length) {
                  const ib = afterH2[k]
                  if (ib.kind === 'heading' && (ib.level || 1) >= 3 && (ib.level || 1) <= 6) {
                    flushPending()
                    const level = ib.level || 3
                    const prefix = ib.text
                    k++
                    const after: Block[] = []
                    while (k < afterH2.length) {
                      const xb = afterH2[k]
                      if (xb.kind === 'heading' && (xb.level || 1) <= level) break
                      after.push(xb)
                      k++
                    }
                    const slides = packBlocksIntoSlides(after, prefix)
                    if (!slides.length) currentStack.push(prefix)
                    else currentStack.push(...slides)
                    continue
                  }
                  pending.push(ib)
                  k++
                }
                flushPending()
                afterH2.length = 0
              }
              currentStack.push('::PM_TOC_OVERVIEW::')
              j++
              continue
            }
            afterH2.push(tb)
            j++
          }
          if (afterH2.length) {
            // Ensure at most one H3 per page: segment by H3 inside H2
            let k = 0
            let pending: Block[] = []
            const flushPending = () => {
              if (pending.length) {
                const slides = packBlocksIntoSlides(pending, null)
                currentStack.push(...slides)
                pending = []
              }
            }
            while (k < afterH2.length) {
              const ib = afterH2[k]
              if (ib.kind === 'heading' && (ib.level || 1) >= 3 && (ib.level || 1) <= 6) {
                flushPending()
                const level = ib.level || 3
                const prefix = ib.text
                k++
                const after: Block[] = []
                while (k < afterH2.length) {
                  const xb = afterH2[k]
                  if (xb.kind === 'heading' && (xb.level || 1) <= level) break
                  after.push(xb)
                  k++
                }
                const slides = packBlocksIntoSlides(after, prefix)
                if (!slides.length) currentStack.push(prefix)
                else currentStack.push(...slides)
                continue
              }
              pending.push(ib)
              k++
            }
            flushPending()
          }
          continue
        }
        if (nb.kind === 'heading' && (nb.level || 1) >= 3 && (nb.level || 1) <= 6) {
          if (seg.length) {
            const slides = packBlocksIntoSlides(seg, null)
            currentStack.push(...slides)
            seg.length = 0
          }
          const level = nb.level || 3
          const prefix = nb.text
          j++
          const after: Block[] = []
          while (j < blocks.length) {
            const tb = blocks[j]
            if (tb.kind === 'heading' && (tb.level || 1) <= level) break
            after.push(tb)
            j++
          }
          const slides = packBlocksIntoSlides(after, prefix)
          if (!slides.length) currentStack.push(prefix)
          else currentStack.push(...slides)
          continue
        }
        seg.push(nb)
        j++
      }
      if (seg.length) {
        const slides = packBlocksIntoSlides(seg, null)
        currentStack.push(...slides)
      }
      continue
    }
    if (b.kind === 'heading' && (b.level || 1) === 2) {
      if (!currentStack.length) flushStack()
      currentStack.push(b.text)
      j++
      const inner: Block[] = []
      while (j < blocks.length) {
        const tb = blocks[j]
        if (tb.kind === 'heading' && (tb.level || 1) <= 2) break
        inner.push(tb)
        j++
      }
      let k = 0
      let pending: Block[] = []
      const flushPending = () => {
        if (pending.length) {
          const slides = packBlocksIntoSlides(pending, null)
          currentStack.push(...slides)
          pending = []
        }
      }
      while (k < inner.length) {
        const nb = inner[k]
        if (nb.kind === 'toc') {
          flushPending()
          currentStack.push('::PM_TOC_OVERVIEW::')
          k++
          continue
        }
        if (nb.kind === 'heading' && (nb.level || 1) >= 3 && (nb.level || 1) <= 6) {
          flushPending()
          const level = nb.level || 3
          const prefix = nb.text
          k++
          const after: Block[] = []
          while (k < inner.length) {
            const tb = inner[k]
            if (tb.kind === 'heading' && (tb.level || 1) <= level) break
            after.push(tb)
            k++
          }
          const slides = packBlocksIntoSlides(after, prefix)
          if (!slides.length) currentStack.push(prefix)
          else currentStack.push(...slides)
          continue
        }
        pending.push(nb)
        k++
      }
      flushPending()
      continue
    }
    if (b.kind === 'heading' && (b.level || 1) >= 3 && (b.level || 1) <= 6) {
      const level = b.level || 3
      const prefix = b.text
      j++
      const after: Block[] = []
      while (j < blocks.length) {
        const tb = blocks[j]
        if (tb.kind === 'heading' && (tb.level || 1) <= level) break
        after.push(tb)
        j++
      }
      const slides = packBlocksIntoSlides(after, prefix)
      if (!slides.length) currentStack.push(prefix)
      else currentStack.push(...slides)
      continue
    }
    const run: Block[] = []
    while (j < blocks.length) {
      const tb = blocks[j]
      if (tb.kind === 'heading') break
      if (tb.kind === 'toc') {
        if (run.length) {
          const slides = packBlocksIntoSlides(run, null)
          currentStack.push(...slides)
          run.length = 0
        }
        currentStack.push('::PM_TOC_OVERVIEW::')
        j++
        continue
      }
      run.push(tb)
      j++
    }
    if (run.length) {
      const slides = packBlocksIntoSlides(run, null)
      currentStack.push(...slides)
    }
  }
  flushStack()
  return stacks.length ? stacks : [[md]]
}

export const exportRevealToHTML = async (content: string, title: string = 'Slides'): Promise<string> => {
  const { config } = useEditorStore.getState()
  const stacks = (config.slidePagination === 'heading')
    ? paginateAdvanced(content)
    : splitMarkdownToSlideStacks(content)
  const slideSectionsHtml: string[] = []
  for (const stack of stacks) {
    if (stack.length <= 1) {
      const item = stack[0]
      if (item === '::PM_TOC_OVERVIEW::') {
        slideSectionsHtml.push(`<section><h2>目录</h2><div class="pm-toc-block"><ul></ul></div></section>`)
      } else {
        const html = parseMarkdown(item)
        slideSectionsHtml.push(`<section>${html}</section>`)
      }
    } else {
      const inner = stack.map(s => s === '::PM_TOC_OVERVIEW::'
        ? `<section><h2>目录</h2><div class="pm-toc-block"><ul></ul></div></section>`
        : `<section>${parseMarkdown(s)}</section>`
      ).join('')
      slideSectionsHtml.push(`<section>${inner}</section>`)
    }
  }
  const slidesHtmlRaw = slideSectionsHtml.join('\n')
  const afterDiagrams = await prerenderDiagrams(slidesHtmlRaw)
  const { html: slidesHtml, cmCss } = await prerenderCodeBlocks(afterDiagrams)
  const dark = config.theme === 'dark'
  const themeCss = dark ? 'black' : 'white'
  const linkColor = dark ? '#93c5fd' : '#0366d6'
  const blockquoteBorder = dark ? '#374151' : '#dddddd'
  const blockquoteColor = dark ? '#9ca3af' : '#666666'
  const inlineCodeBg = dark ? '#111827' : '#f3f4f6'
  const inlineCodeColor = dark ? '#e5e7eb' : '#111827'
  const preBg = dark ? '#0b1220' : '#f8f9fa'
  const preColor = dark ? '#e5e7eb' : '#1f2937'
  const preBorder = dark ? '#1f2937' : '#e5e7eb'
  const navMode = config.revealNavigationMode || 'default'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/${themeCss}.css" id="theme" />
  <style>
    .reveal a { color: ${linkColor}; }
    .reveal .slides { text-align: left; }
    .reveal .slides section { padding: 12px 24px; }
    .reveal .slides section h1 { font-size: 2.0rem; margin: 0 0 .5rem; }
    .reveal .slides section h2 { font-size: 1.6rem; margin: .25rem 0 .4rem; border-bottom: 1px solid ${dark ? '#1f2937' : '#e5e7eb'}; padding-bottom: .2rem; }
    .reveal .slides section h3 { font-size: 1.3rem; margin: .25rem 0 .25rem; }
    .reveal .slides section p { margin: .4rem 0; }
    .reveal .slides section code { background: ${inlineCodeBg}; color: ${inlineCodeColor}; padding: .12rem .25rem; border-radius: 4px; }
    .reveal .slides section pre { background: ${preBg}; color: ${preColor}; border: 1px solid ${preBorder}; border-radius: 8px; padding: .8rem; max-height: 70vh; overflow: auto; }
    .reveal .slides section pre code { background: transparent; color: inherit; padding: 0; }
    .reveal .slides section blockquote { border-left: 4px solid ${blockquoteBorder}; margin: 0; padding-left: 1rem; color: ${blockquoteColor}; }
    .reveal .slides section img { max-width: 80%; max-height: 70vh; height: auto; border-radius: 6px; display: block; margin: .6rem auto; object-fit: contain; }
    .reveal .slides section table { border-collapse: collapse; width: 80%; margin: .8rem auto; }
    .reveal .slides section th, .reveal .slides section td { border: 1px solid ${dark ? '#374151' : '#dddddd'}; padding: .5rem .6rem; text-align: left; }
    .reveal .slides section th { background: ${dark ? '#111827' : '#f5f5f5'}; font-weight: 600; }
    .pm-toc-block ul { list-style: none; padding-left: 0; }
    .pm-toc-block li { margin: 0.25rem 0; }
${cmCss}
  </style>
  <script>
    window.MathJax = { tex: { inlineMath: [['$', '$']], displayMath: [['$$','$$'], ['\\[','\\]']] }, svg: { fontCache: 'global' } }
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>
  <div class="reveal">
    <div class="slides">
${slidesHtml}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      respondToHashChanges: true,
      jumpToSlide: true,
      slideNumber: true,
      controls: true,
      controlsTutorial: true,
      progress: true,
      center: true,
      transition: 'slide',
      keyboard: true,
      navigationMode: '${navMode}',
      mouseWheel: true,
      touch: true,
      focusBodyOnPageVisibilityChange: true
    });

    function buildHeadingToIndices() {
      const ids = {};
      const sections = Array.from(document.querySelectorAll('.reveal .slides > section'));
      let hIndex = 0;
      for (const sec of sections) {
        const verticals = Array.from(sec.querySelectorAll(':scope > section'));
        if (verticals.length === 0) {
          const heads = Array.from(sec.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]'));
          for (const h of heads) ids[h.id] = { h: hIndex, v: 0 };
        } else {
          let vIndex = 0;
          for (const vsec of verticals) {
            const heads = Array.from(vsec.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]'));
            for (const h of heads) ids[h.id] = { h: hIndex, v: vIndex };
            vIndex++;
          }
        }
        hIndex++;
      }
      return ids;
    }

    function fillGlobalToc() {
      const list = document.querySelector('.pm-toc-block ul');
      if (!list) return;
      const heads = Array.from(document.querySelectorAll('.reveal .slides h1[id], .reveal .slides h2[id], .reveal .slides h3[id], .reveal .slides h4[id], .reveal .slides h5[id], .reveal .slides h6[id]'));
      const items = heads.map(h => {
        const tag = h.tagName.toLowerCase();
        const depth = parseInt(tag.replace('h','')) || 1;
        const title = h.textContent || '';
        const id = h.getAttribute('id') || '';
        return '<li data-depth="' + depth + '"><a href="#' + id + '">' + title + '</a></li>';
      }).join('');
      list.innerHTML = items;
    }

    function wireTocLinks() {
      const ids = buildHeadingToIndices();
      document.querySelectorAll('.pm-toc-block a[href^="#"]').forEach(a => {
        const href = a.getAttribute('href') || '';
        const id = href.slice(1);
        const pos = ids[id];
        if (pos) {
          a.setAttribute('href', '#/' + pos.h + '/' + (pos.v || 0));
          a.addEventListener('click', (e) => { e.preventDefault(); Reveal.slide(pos.h, pos.v || 0); });
        }
      });
    }
    fillGlobalToc();
    wireTocLinks();

    const revealEl = document.querySelector('.reveal');
    if (revealEl) { revealEl.setAttribute('tabindex', '0'); revealEl.focus(); }
  </script>
</body>
</html>`
}

export const exportReveal = async (content: string, filename: string = 'slides.html') => {
  const htmlContent = await exportRevealToHTML(content)
  downloadFile(htmlContent, filename, 'text/html')
}
