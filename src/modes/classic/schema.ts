import { Schema } from 'prosemirror-model'

const nodes = {
  doc: { content: 'block+' },
  paragraph: {
    group: 'block',
    content: 'inline*',
    toDOM: () => ['p', 0],
    parseDOM: [{ tag: 'p' }]
  },
  text: { group: 'inline' },
  hard_break: {
    inline: true,
    group: 'inline',
    selectable: false,
    toDOM: () => ['br'],
    parseDOM: [{ tag: 'br' }]
  },
  heading: {
    group: 'block',
    attrs: { level: { default: 1 } },
    content: 'inline*',
    toDOM: (node: any) => ['h' + (node.attrs.level || 1), 0],
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
    toDOM: () => ['blockquote', 0],
    parseDOM: [{ tag: 'blockquote' }]
  },
  code_block: {
    group: 'block',
    content: 'text*',
    marks: '',
    code: true,
    attrs: { language: { default: '' } },
    toDOM: (node: any) => ['pre', ['code', node.attrs.language ? { 'data-language': node.attrs.language } : {}, 0]],
    parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }]
  },
  ordered_list: {
    group: 'block',
    content: 'list_item+',
    attrs: { order: { default: 1 } },
    toDOM: (node: any) => ['ol', node.attrs.order && node.attrs.order !== 1 ? { start: node.attrs.order } : {}, 0],
    parseDOM: [{ tag: 'ol' }]
  },
  bullet_list: {
    group: 'block',
    content: 'list_item+',
    toDOM: () => ['ul', 0],
    parseDOM: [{ tag: 'ul' }]
  },
  list_item: {
    attrs: { checked: { default: null } },
    content: 'paragraph block*',
    toDOM: (node: any) => ['li', node.attrs.checked !== null ? { 'data-checked': String(!!node.attrs.checked) } : {}, 0],
    parseDOM: [{ tag: 'li', getAttrs: (el: any) => {
      const val = el.getAttribute ? el.getAttribute('data-checked') : null
      if (val == null) return { checked: null }
      return { checked: val === 'true' }
    } }]
  },
  horizontal_rule: {
    group: 'block',
    toDOM: () => ['hr'],
    parseDOM: [{ tag: 'hr' }]
  },
  math_block: {
    group: 'block',
    content: 'text*',
    marks: '',
    attrs: { raw: { default: '' }, env: { default: '' }, numbered: { default: false } },
    toDOM: () => ['div', { class: 'pm-math-block' }, 0],
    parseDOM: [{ tag: 'div.pm-math-block' }]
  }
}

const marks = {
  strong: { toDOM: () => ['strong', 0], parseDOM: [{ tag: 'strong' }, { tag: 'b', getAttrs: () => ({}) }] },
  em: { toDOM: () => ['em', 0], parseDOM: [{ tag: 'em' }, { tag: 'i', getAttrs: () => ({}) }] },
  code: { toDOM: () => ['code', 0], parseDOM: [{ tag: 'code' }] },
  link: {
    attrs: { href: {}, title: { default: null } },
    inclusive: false,
    toDOM: (mark: any) => ['a', { href: mark.attrs.href || '', title: mark.attrs.title || null, rel: 'noopener noreferrer' }, 0],
    parseDOM: [{ tag: 'a[href]', getAttrs: (el: any) => ({ href: el.getAttribute('href') || '', title: el.getAttribute('title') || null }) }]
  }
}

; (nodes as any).image = {
  inline: true,
  group: 'inline',
  selectable: false,
  attrs: { src: {}, alt: { default: null }, title: { default: null } },
  toDOM: (node: any) => ['img', { src: node.attrs.src || '', alt: node.attrs.alt || null, title: node.attrs.title || null }],
  parseDOM: [{ tag: 'img', getAttrs: (el: any) => ({ src: el.getAttribute('src') || '', alt: el.getAttribute('alt') || null, title: el.getAttribute('title') || null }) }]
}

export const schema = new Schema({ nodes, marks })
