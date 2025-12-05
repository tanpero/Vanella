import { Schema } from 'prosemirror-model'
import type { Node as PMNode, Mark as PMMark } from 'prosemirror-model'

const nodes = {
  doc: { content: 'block+' },
  paragraph: {
    group: 'block',
    content: 'inline*',
    toDOM: () => ['p', 0] as const,
    parseDOM: [{ tag: 'p' }]
  },
  text: { group: 'inline' },
  hard_break: {
    inline: true,
    group: 'inline',
    selectable: false,
    toDOM: () => ['br'] as const,
    parseDOM: [{ tag: 'br' }]
  },
  heading: {
    group: 'block',
    attrs: { level: { default: 1 } },
    content: 'inline*',
    toDOM: (node: PMNode) => ['h' + (node.attrs.level || 1), 0] as const,
    parseDOM: [
      { tag: 'h1', attrs: { level: 1 } },
      { tag: 'h2', attrs: { level: 2 } },
      { tag: 'h3', attrs: { level: 3 } },
      { tag: 'h4', attrs: { level: 4 } },
      { tag: 'h5', attrs: { level: 5 } },
      { tag: 'h6', attrs: { level: 6 } }
    ]
  },
  blockquote: {
    group: 'block',
    content: 'block+',
    toDOM: () => ['blockquote', 0] as const,
    parseDOM: [{ tag: 'blockquote' }]
  },
  code_block: {
    group: 'block',
    content: 'text*',
    marks: '',
    code: true,
    attrs: { language: { default: '' } },
    toDOM: (node: PMNode) => ['pre', ['code', node.attrs.language ? { 'data-language': node.attrs.language } : {}, 0]] as const,
    parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' as const }]
  },
  ordered_list: {
    group: 'block',
    content: 'list_item+',
    attrs: { order: { default: 1 } },
    toDOM: (node: PMNode) => ['ol', node.attrs.order && node.attrs.order !== 1 ? { start: node.attrs.order } : {}, 0] as const,
    parseDOM: [{ tag: 'ol' }]
  },
  bullet_list: {
    group: 'block',
    content: 'list_item+',
    toDOM: () => ['ul', 0] as const,
    parseDOM: [{ tag: 'ul' }]
  },
  list_item: {
    attrs: { checked: { default: null } },
    content: 'paragraph block*',
    toDOM: (node: PMNode) => ['li', node.attrs.checked !== null ? { 'data-checked': String(!!node.attrs.checked) } : {}, 0] as const,
    parseDOM: [{ tag: 'li', getAttrs: (el: Element) => {
      const val = el.getAttribute ? el.getAttribute('data-checked') : null
      if (val == null) return { checked: null }
      return { checked: val === 'true' }
    } }]
  },
  horizontal_rule: {
    group: 'block',
    toDOM: () => ['hr'] as const,
    parseDOM: [{ tag: 'hr' }]
  },
  math_block: {
    group: 'block',
    content: 'text*',
    marks: '',
    attrs: { raw: { default: '' }, env: { default: '' }, numbered: { default: false } },
    toDOM: () => ['div', { class: 'pm-math-block' }, 0] as const,
    parseDOM: [{ tag: 'div.pm-math-block' }]
  }
  , mermaid_block: {
    group: 'block',
    content: 'text*',
    marks: '',
    attrs: { theme: { default: '' } },
    toDOM: () => ['div', { class: 'pm-mermaid-block' }, 0] as const,
    parseDOM: [{ tag: 'div.pm-mermaid-block' }]
  }
  , abc_block: {
    group: 'block',
    content: 'text*',
    marks: '',
    toDOM: () => ['div', { class: 'pm-abc-block' }, 0] as const,
    parseDOM: [{ tag: 'div.pm-abc-block' }]
  }
  , toc_block: {
    group: 'block',
    content: '',
    marks: '',
    toDOM: () => ['div', { class: 'pm-toc-block' }] as const,
    parseDOM: [{ tag: 'div.pm-toc-block' }]
  }
}

const marks = {
  strong: { toDOM: () => ['strong', 0] as const, parseDOM: [{ tag: 'strong' }, { tag: 'b', getAttrs: () => ({}) }] },
  em: { toDOM: () => ['em', 0] as const, parseDOM: [{ tag: 'em' }, { tag: 'i', getAttrs: () => ({}) }] },
  code: { toDOM: () => ['code', 0] as const, parseDOM: [{ tag: 'code' }] },
  link: {
    attrs: { href: {}, title: { default: null } },
    inclusive: false,
    toDOM: (mark: PMMark) => ['a', { href: (mark.attrs as { href?: string }).href || '', title: (mark.attrs as { title?: string | null }).title || null, rel: 'noopener noreferrer' }, 0] as const,
    parseDOM: [{ tag: 'a[href]', getAttrs: (el: Element) => ({ href: el.getAttribute('href') || '', title: el.getAttribute('title') || null }) }]
  }
}

; (nodes as unknown as Record<string, unknown>).image = {
  inline: true,
  group: 'inline',
  selectable: false,
  attrs: { src: {}, alt: { default: null }, title: { default: null } },
  toDOM: (node: PMNode) => ['img', { src: node.attrs.src || '', alt: node.attrs.alt || null, title: node.attrs.title || null }] as const,
  parseDOM: [{ tag: 'img', getAttrs: (el: Element) => ({ src: el.getAttribute('src') || '', alt: el.getAttribute('alt') || null, title: el.getAttribute('title') || null }) }]
}

export const schema = new Schema({ nodes, marks })
