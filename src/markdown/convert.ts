import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import { Node as PMNode, Schema, Mark } from 'prosemirror-model'

function textWithMarks(schema: Schema, value: string, marks: Mark[] = []): PMNode {
  return schema.text(value, marks)
}

function splitInlineMathText(schema: Schema, value: string): PMNode[] {
  const out: PMNode[] = []
  let i = 0
  while (i < value.length) {
    // \( ... \) inline math → normalize to $...$
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

export async function markdownToPmDoc(schema: Schema, markdown: string): Promise<PMNode> {
  const md: any = await unified().use(remarkParse).use(remarkGfm).use(remarkBreaks).use(remarkMath).parse(markdown)

  function pmInline(children: any[]): PMNode[] {
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
        const inner = pmInline(child.children || [])
        out.push(...inner.map(n => n.isText ? textWithMarks(schema, n.text || '', [mark]) : n))
      } else if (child.type === 'emphasis') {
        const mark = schema.marks.em.create()
        const inner = pmInline(child.children || [])
        out.push(...inner.map(n => n.isText ? textWithMarks(schema, n.text || '', [mark]) : n))
      } else if (child.type === 'inlineCode') {
        const mark = schema.marks.code.create()
        out.push(textWithMarks(schema, child.value || '', [mark]))
      } else if (child.type === 'link') {
        const href = child.url || ''
        const title = child.title || null
        const linkMark = schema.marks.link && schema.marks.link.create({ href, title })
        const inner = pmInline(child.children || [])
        if (linkMark) {
          out.push(...inner.map(n => n.isText ? textWithMarks(schema, n.text || '', [linkMark, ...(n.marks || [])]) : n))
        } else {
          const innerText = (child.children || []).map((c: any) => c.value || '').join('')
          out.push(textWithMarks(schema, innerText || href))
        }
      } else if (child.type === 'image') {
        const src = child.url || ''
        const alt = child.alt || null
        const title = child.title || null
        const img = (schema.nodes as any).image && (schema.nodes as any).image.create({ src, alt, title })
        if (img) out.push(img)
        else out.push(textWithMarks(schema, alt || ''))
      }
    }
    return out
  }

  function pmBlock(node: any): PMNode | null {
    switch (node.type) {
      case 'paragraph': {
        const text = (node.children || []).map((c: any) => c.value || '').join('')
        const bracket = /^\\\[[\s\S]*\\\]$/.exec(text)
        if (bracket) {
          const raw = text.slice(2, -2)
          return schema.nodes.math_block.create({}, schema.text(raw))
        }
        return schema.nodes.paragraph.create(null, pmInline(node.children || []))
      }
      case 'heading':
        return schema.nodes.heading.create({ level: Math.min(Math.max(node.depth || 1, 1), 6) }, pmInline(node.children || []))
      case 'blockquote': {
        const innerBlocks = (node.children || []).map(pmBlock).filter(Boolean) as PMNode[]
        return schema.nodes.blockquote.create(null, innerBlocks)
      }
      case 'code':
        return schema.nodes.code_block.create({ language: node.lang || '' }, schema.text(node.value || ''))
      case 'math': {
        const raw = node.value || ''
        const m = /^\s*\\begin\{([A-Za-z]+\*?)\}([\s\S]*?)\\end\{\1\}\s*$/.exec(raw)
        if (m) {
          const env = m[1]
          const body = m[2]
          return schema.nodes.math_block.create({ env }, schema.text(body || ''))
        }
        return schema.nodes.math_block.create({}, schema.text(raw))
      }
      case 'list': {
        const isOrdered = !!node.ordered
        const listNodeType = isOrdered ? schema.nodes.ordered_list : schema.nodes.bullet_list
        const items = (node.children || []).map((li: any) => {
          const liChildren = (li.children || []).map(pmBlock).filter(Boolean) as PMNode[]
          const checked = (typeof li.checked === 'boolean') ? li.checked : null
          return schema.nodes.list_item.create({ checked }, liChildren.length ? liChildren : [schema.nodes.paragraph.create(null, [])])
        })
        return listNodeType.create(isOrdered ? { order: node.start || 1 } : null, items)
      }
      case 'thematicBreak':
        return schema.nodes.horizontal_rule.create()
      default:
        return null
    }
  }

  const children = (md.children || []).map(pmBlock).filter(Boolean) as PMNode[]
  const doc = schema.nodes.doc.create(null, children.length ? children : [schema.nodes.paragraph.create(null, [])])
  return doc
}

export async function pmDocToMarkdown(doc: PMNode): Promise<string> {
  function mdInlineFromPM(node: PMNode): any[] {
    const out: any[] = []
    for (let i = 0; i < node.childCount; i++) {
      const ch = node.child(i)
      if (ch.isText) {
        let leaf: any = { type: 'text', value: ch.text || '' }
        const marks = ch.marks || []
        const hasLink = marks.find(m => m.type.name === 'link')
        for (const m of marks) {
          if (m.type.name === 'strong') leaf = { type: 'strong', children: [leaf] }
          if (m.type.name === 'em') leaf = { type: 'emphasis', children: [leaf] }
          if (m.type.name === 'code') leaf = { type: 'inlineCode', value: ch.text || '' }
        }
        if (hasLink) {
          leaf = { type: 'link', url: hasLink.attrs.href || '', title: hasLink.attrs.title || null, children: [leaf] }
        }
        out.push(leaf)
      } else if (ch.type.name === 'image') {
        out.push({ type: 'image', url: ch.attrs.src || '', alt: ch.attrs.alt || null, title: ch.attrs.title || null })
      }
    }
    return out
  }

  function mdBlockFromPM(node: PMNode): any | null {
    const name = node.type.name
    if (name === 'paragraph') return { type: 'paragraph', children: mdInlineFromPM(node) }
    if (name === 'heading') return { type: 'heading', depth: node.attrs.level || 1, children: mdInlineFromPM(node) }
    if (name === 'blockquote') {
      const children = [] as any[]
      node.forEach(child => { const m = mdBlockFromPM(child); if (m) children.push(m) })
      return { type: 'blockquote', children }
    }
    if (name === 'code_block') return { type: 'code', lang: node.attrs.language || '', value: node.textContent || '' }
    if (name === 'ordered_list' || name === 'bullet_list') {
      const ordered = name === 'ordered_list'
      const start = ordered ? (node.attrs.order || 1) : undefined
      const children = [] as any[]
      node.forEach(li => {
        const liChildren = [] as any[]
        li.forEach(c => { const m = mdBlockFromPM(c); if (m) liChildren.push(m) })
        const liNode: any = { type: 'listItem', children: liChildren.length ? liChildren : [{ type: 'paragraph', children: [] }] }
        if (li.attrs && li.attrs.checked !== null && typeof li.attrs.checked === 'boolean') liNode.checked = !!li.attrs.checked
        children.push(liNode)
      })
      const mdList: any = { type: 'list', ordered, children }
      if (start && start !== 1) mdList.start = start
      return mdList
    }
    if (name === 'horizontal_rule') return { type: 'thematicBreak' }
    if (name === 'math_block') {
      const env = node.attrs.env || ''
      const raw = node.textContent || ''
      const body = env ? `\\begin{${env}}\n${raw}\n\\end{${env}}` : raw
      const value = body
      return { type: 'math', value }
    }
    return null
  }

  const mdChildren: any[] = []
  doc.forEach(child => { const m = mdBlockFromPM(child); if (m) mdChildren.push(m) })
  const root = { type: 'root', children: mdChildren } as any
  const file = await unified().use(remarkStringify, { fences: true, listItemIndent: 'one' }).use(remarkGfm).use(remarkBreaks).use(remarkMath).stringify(root)
  return String(file)
}
