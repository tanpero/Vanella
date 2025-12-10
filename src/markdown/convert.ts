import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import { Node as PMNode, Schema, Mark } from 'prosemirror-model'
import type { MdNode, MdRoot } from '@/types/markdown'

function textWithMarks(schema: Schema, value: string, marks: Mark[] = []): PMNode {
  return schema.text(value, marks)
}

function splitInlineMathText(schema: Schema, value: string): PMNode[] {
  const out: PMNode[] = []
  let i = 0
  while (i < value.length) {
    if (value[i] === '\\' && value[i + 1] === '(') {
      let j = i + 2
      while (j < value.length && !(value[j] === '\\' && value[j + 1] === ')')) j++
      if (j < value.length) {
        const raw = value.slice(i + 2, j)
        out.push(schema.text(`$${raw}$`))
        i = j + 2
        continue
      }
    }
    // \[ ... \] inside paragraph → treat as inline, normalize to $...$
    if (value[i] === '\\' && value[i + 1] === '[') {
      let j = i + 2
      while (j < value.length && !(value[j] === '\\' && value[j + 1] === ']')) j++
      if (j < value.length) {
        const raw = value.slice(i + 2, j)
        out.push(schema.text(`$${raw}$`))
        i = j + 2
        continue
      }
    }
    // $ ... $ inline math stays
    if (value[i] === '$') {
      let j = i + 1
      while (j < value.length && value[j] !== '$') j++
      if (j < value.length) {
        const raw = value.slice(i + 1, j)
        out.push(schema.text(`$${raw}$`))
        i = j + 1
        continue
      }
    }
    // plain text chunk
    let k = i
    while (
      k < value.length &&
      !(value[k] === '\\' && (value[k + 1] === '(' || value[k + 1] === '[')) &&
      value[k] !== '$'
    ) k++
    const plain = value.slice(i, k)
    if (plain) out.push(schema.text(plain))
    i = k
  }
  return out
}

 

function normalizeInlineMath(input: string): string {
  let out = ''
  let i = 0
  while (i < input.length) {
    if (input[i] === '\\' && input[i + 1] === '(') {
      let j = i + 2
      while (j < input.length && !(input[j] === '\\' && input[j + 1] === ')')) j++
      if (j < input.length) { const raw = input.slice(i + 2, j); out += `$${raw}$`; i = j + 2; continue }
    }
    out += input[i]
    i++
  }
  return out
}

function pmInline(schema: Schema, children: MdNode[]): PMNode[] {
  const out: PMNode[] = []
  for (const child of children || []) {
    if (child.type === 'text') {
      const segs = splitInlineMathText(schema, child.value || '')
      out.push(...segs)
    } else if (child.type === 'inlineMath') {
      const raw = `$${child.value || ''}$`
      out.push(schema.text(raw))
    } else if (child.type === 'strong') {
      const mark = schema.marks.strong.create()
      const inner = pmInline(schema, child.children || [])
      out.push(...inner.map(n => n.isText ? textWithMarks(schema, n.text || '', [mark]) : n))
    } else if (child.type === 'emphasis') {
      const mark = schema.marks.em.create()
      const inner = pmInline(schema, child.children || [])
      out.push(...inner.map(n => n.isText ? textWithMarks(schema, n.text || '', [mark]) : n))
    } else if (child.type === 'inlineCode') {
      const mark = schema.marks.code.create()
      out.push(textWithMarks(schema, child.value || '', [mark]))
    } else if (child.type === 'link') {
      const href = child.url || ''
      const title = child.title || null
      const linkMark = schema.marks.link && schema.marks.link.create({ href, title })
      const inner = pmInline(schema, child.children || [])
      if (linkMark) out.push(...inner.map(n => n.isText ? textWithMarks(schema, n.text || '', [linkMark, ...(n.marks || [])]) : n))
      else { const innerText = (child.children || []).map((c) => (c.value || '')).join(''); out.push(textWithMarks(schema, innerText || href)) }
    } else if (child.type === 'image') {
      const src = child.url || ''
      const alt = child.alt || null
      const title = child.title || null
      const imageType = (schema.nodes as unknown as { image?: import('prosemirror-model').NodeType }).image
      const img = imageType && imageType.create({ src, alt, title })
      if (img) out.push(img)
      else out.push(textWithMarks(schema, alt || ''))
    }
  }
  return out
}

function pmBlock(schema: Schema, node: MdNode): PMNode | null {
  switch (node.type) {
    case 'paragraph': {
      const text = (node.children || []).map((c) => (c.value || '')).join('')
      const trimmed = (text || '').trim()
      if (/^\[\s*toc\s*\]$/i.test(trimmed)) {
        const tocType = (schema.nodes as unknown as { toc_block?: import('prosemirror-model').NodeType }).toc_block
        return tocType?.create() || schema.nodes.paragraph.create(null, [])
      }
      const bracket = /^\[\s*[\s\S]*\s*\]$/.exec(text)
      if (bracket) { const raw = text.slice(2, -2); return schema.nodes.math_block.create({}, schema.text(raw)) }
      return schema.nodes.paragraph.create(null, pmInline(schema, node.children || []))
    }
    case 'heading':
      return schema.nodes.heading.create({ level: Math.min(Math.max(node.depth || 1, 1), 6) }, pmInline(schema, node.children || []))
    case 'blockquote': {
      const innerBlocks = (node.children || []).map(n => pmBlock(schema, n)).filter(Boolean) as PMNode[]
      return schema.nodes.blockquote.create(null, innerBlocks)
    }
    case 'code': {
      const lang = (node.lang || '').toLowerCase()
      if (lang === 'mermaid') {
        const mermaidType = (schema.nodes as unknown as { mermaid_block?: import('prosemirror-model').NodeType }).mermaid_block
        return mermaidType?.create({}, schema.text(node.value || '')) || null
      }
      if (lang === 'abc') {
        const abcType = (schema.nodes as unknown as { abc_block?: import('prosemirror-model').NodeType }).abc_block
        return abcType?.create({}, schema.text(node.value || '')) || null
      }
      return schema.nodes.code_block.create({ language: node.lang || '' }, schema.text(node.value || ''))
    }
    case 'math': {
      const raw = node.value || ''
      const m = /^\s*\\begin\{([A-Za-z]+\*?)\}([\s\S]*?)\\end\{\1\}\s*$/.exec(raw)
      if (m) { const env = m[1]; const body = m[2]; return schema.nodes.math_block.create({ env }, schema.text(body || '')) }
      return schema.nodes.math_block.create({}, schema.text(raw))
    }
    case 'list': {
      const isOrdered = !!node.ordered
      const listNodeType = isOrdered ? schema.nodes.ordered_list : schema.nodes.bullet_list
      const items = (node.children || []).map((l) => {
        const liChildren = (l.children || []).map(n => pmBlock(schema, n)).filter(Boolean) as PMNode[]
        const checked = (typeof l.checked === 'boolean') ? l.checked : null
        return schema.nodes.list_item.create({ checked }, liChildren.length ? liChildren : [schema.nodes.paragraph.create(null, [])])
      })
      return listNodeType.create(isOrdered ? { order: node.start || 1 } : null, items)
    }
    case 'thematicBreak':
      return schema.nodes.horizontal_rule.create()
    case 'table': {
      const tbl = schema.nodes as unknown as {
        table: import('prosemirror-model').NodeType
        table_row: import('prosemirror-model').NodeType
        table_cell: import('prosemirror-model').NodeType
        table_header: import('prosemirror-model').NodeType
      }
      const tableType = tbl.table
      const rowType = tbl.table_row
      const cellType = tbl.table_cell
      const headerType = tbl.table_header
      const aligns = ((node as unknown as { align?: Array<'left'|'center'|'right' | null> }).align || [])
      const rows = (node.children || [])
      const pmRows: PMNode[] = []
      rows.forEach((r, idx) => {
        if (r.type !== 'tableRow') return
        const cells: PMNode[] = []
        for (const c of (r.children || [])) {
          if (c.type !== 'tableCell') continue
          const para = schema.nodes.paragraph.create(null, pmInline(schema, c.children || []))
          const cell = (idx === 0 ? headerType : cellType).create(null, [para])
          cells.push(cell)
        }
        pmRows.push(rowType.create(null, cells))
      })
      const colalign = aligns.map(a => (a || 'left')) as Array<'left'|'center'|'right'>
      return tableType.create({ colalign }, pmRows)
    }
    default:
      return null
  }
}

export async function markdownToPmDoc(schema: Schema, markdown: string): Promise<PMNode> {
  const normalized = normalizeInlineMath(markdown)
  const md = unified().use(remarkParse).use(remarkGfm).use(remarkBreaks).use(remarkMath).parse(normalized) as unknown as MdRoot
  const children = (md.children || []).map(n => pmBlock(schema, n)).filter(Boolean) as PMNode[]
  const doc = schema.nodes.doc.create(null, children.length ? children : [schema.nodes.paragraph.create(null, [])])
  return doc
}

const unescapeMdInMath = (input: string): string => input.replace(/\\([_*#])/g, '$1')

function splitTextToMdNodes(text: string): MdNode[] {
  const nodes: MdNode[] = []
  let i = 0
  while (i < text.length) {
    if (text[i] === '\\' && text[i + 1] === '(') {
      let j = i + 2
      while (j < text.length && !(text[j] === '\\' && text[j + 1] === ')')) j++
      if (j < text.length) { nodes.push({ type: 'inlineMath', value: unescapeMdInMath(text.slice(i + 2, j)) }); i = j + 2; continue }
      else { nodes.push({ type: 'text', value: '\\(' }); i = i + 2; continue }
    }
    if (text[i] === '$') {
      let j = i + 1
      while (j < text.length && text[j] !== '$') j++
      if (j < text.length) { nodes.push({ type: 'inlineMath', value: unescapeMdInMath(text.slice(i + 1, j)) }); i = j + 1; continue }
      else { nodes.push({ type: 'text', value: '$' }); i = i + 1; continue }
    }
    let k = i
    while (k < text.length && !(text[k] === '\\' && text[k + 1] === '(') && text[k] !== '$') k++
    const plain = text.slice(i, k)
    if (plain) nodes.push({ type: 'text', value: plain })
    i = k
  }
  return nodes
}

function applyMarksToTextNode(leaf: MdNode, marks: readonly Mark[], fullText: string): MdNode {
  let result: MdNode = leaf
  for (const m of marks || []) {
    if (m.type.name === 'code') result = { type: 'inlineCode', value: fullText }
    else if (m.type.name === 'strong') result = { type: 'strong', children: [result] }
    else if (m.type.name === 'em') result = { type: 'emphasis', children: [result] }
  }
  return result
}

function mdInlineFromPM(node: PMNode): MdNode[] {
  const out: MdNode[] = []
  for (let i = 0; i < node.childCount; i++) {
    const ch = node.child(i)
    if (ch.isText) {
      const marks = ch.marks || []
      const linkMark = marks.find(m => m.type.name === 'link')
      const segs = splitTextToMdNodes(ch.text || '')
      const children: MdNode[] = []
      for (const seg of segs) {
        if (seg.type === 'text') children.push(applyMarksToTextNode(seg, marks, seg.value || ''))
        else if (seg.type === 'inlineMath') children.push({ type: 'inlineMath', value: seg.value || '' })
        else children.push(seg)
      }
      if (linkMark) out.push({ type: 'link', url: linkMark.attrs.href || '', title: linkMark.attrs.title || null, children })
      else out.push(...children)
    } else if (ch.type.name === 'image') {
      out.push({ type: 'image', url: ch.attrs.src || '', alt: ch.attrs.alt || null, title: ch.attrs.title || null })
    }
  }
  return out
}

function mdBlockFromPM(node: PMNode): MdNode | null {
  const name = node.type.name
  if (name === 'paragraph') return { type: 'paragraph', children: mdInlineFromPM(node) }
  if (name === 'heading') return { type: 'heading', depth: node.attrs.level || 1, children: mdInlineFromPM(node) }
  if (name === 'blockquote') {
    const children: MdNode[] = []
    node.forEach(child => { const m = mdBlockFromPM(child); if (m) children.push(m) })
    return { type: 'blockquote', children }
  }
  if (name === 'code_block') return { type: 'code', lang: node.attrs.language || '', value: node.textContent || '' }
  if (name === 'mermaid_block') return { type: 'code', lang: 'mermaid', value: node.textContent || '' }
  if (name === 'abc_block') return { type: 'code', lang: 'abc', value: node.textContent || '' }
  if (name === 'ordered_list' || name === 'bullet_list') {
    const ordered = name === 'ordered_list'
    const start = ordered ? (node.attrs.order || 1) : undefined
    const children: MdNode[] = []
    node.forEach(li => {
      const liChildren: MdNode[] = []
      li.forEach(c => { const m = mdBlockFromPM(c); if (m) liChildren.push(m) })
      const liNode: MdNode = { type: 'listItem', children: liChildren.length ? liChildren : [{ type: 'paragraph', children: [] }] }
      if (li.attrs && li.attrs.checked !== null && typeof li.attrs.checked === 'boolean') (liNode as { checked?: boolean }).checked = !!li.attrs.checked
      children.push(liNode)
    })
    const mdList: MdNode = { type: 'list', ordered, children }
    if (start && start !== 1) mdList.start = start
    return mdList
  }
  if (name === 'horizontal_rule') return { type: 'thematicBreak' }
  if (name === 'math_block') {
    const env = node.attrs.env || ''
    const raw = node.textContent || ''
    const body = env ? `\\begin{${env}}\n${raw}\n\\end{${env}}` : raw
    const value = unescapeMdInMath(body)
    return { type: 'math', value }
  }
  if (name === 'toc_block') return { type: 'paragraph', children: [{ type: 'text', value: '[TOC]' }] }
  if (name === 'table') {
    let hasSpan = false
    node.forEach(row => { row.forEach(cell => { if ((cell.attrs?.colspan || 1) > 1 || (cell.attrs?.rowspan || 1) > 1) hasSpan = true }) })
    const aligns = (node.attrs?.colalign || []) as Array<'left'|'center'|'right'>
    if (!hasSpan) {
      const rows: MdNode[] = []
      node.forEach(row => {
        const cells: MdNode[] = []
        row.forEach(cell => { const para = cell.firstChild; const children = para ? mdInlineFromPM(para as PMNode) : []; cells.push({ type: 'tableCell', children }) })
        rows.push({ type: 'tableRow', children: cells })
      })
      return { type: 'table', align: aligns, children: rows }
    }
    const escape = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const stringifyInline = (children: MdNode[]): string => {
      const run = (n: MdNode): string => {
        if (n.type === 'text') return escape(n.value || '')
        if (n.type === 'inlineCode') return `<code>${escape(n.value || '')}</code>`
        if (n.type === 'strong') return `<strong>${(n.children || []).map(run).join('')}</strong>`
        if (n.type === 'emphasis') return `<em>${(n.children || []).map(run).join('')}</em>`
        if (n.type === 'link') return `<a href="${escape(n.url || '')}">${(n.children || []).map(run).join('')}</a>`
        if (n.type === 'image') return `<img src="${escape(n.url || '')}" alt="${escape(n.alt || '')}" />`
        if (n.children && n.children.length) return n.children.map(run).join('')
        return ''
      }
      return children.map(run).join('')
    }
    let html = '<table class="md-table"><tbody>'
    const alignStyle = (i: number) => { const a = aligns[i] || 'left'; return a === 'left' ? 'text-align:left' : (a === 'center' ? 'text-align:center' : 'text-align:right') }
    let rowIndex = 0
    node.forEach(row => {
      html += '<tr>'
      let cellIndex = 0
      row.forEach(cell => {
        const para = cell.firstChild
        const children = para ? mdInlineFromPM(para as PMNode) : []
        const tag = rowIndex === 0 ? 'th' : 'td'
        const cs = cell.attrs?.colspan || 1
        const rs = cell.attrs?.rowspan || 1
        const style = alignStyle(cellIndex)
        html += `<${tag} style="${style}"${cs > 1 ? ` colspan="${cs}"` : ''}${rs > 1 ? ` rowspan="${rs}"` : ''}>${stringifyInline(children)}</${tag}>`
        cellIndex += cs
      })
      html += '</tr>'
      rowIndex++
    })
    html += '</tbody></table>'
    return { type: 'html', value: html }
  }
  return null
}

export async function pmDocToMarkdown(doc: PMNode): Promise<string> {
  const mdChildren: MdNode[] = []
  doc.forEach(child => { const m = mdBlockFromPM(child); if (m) mdChildren.push(m) })
  const root: MdRoot = { type: 'root', children: mdChildren }
  const file = await unified()
    .use(remarkStringify, { fences: true, listItemIndent: 'one', rule: '-', ruleRepetition: 3, ruleSpaces: false })
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkMath)
    .stringify(root as never)
  return String(file)
}
