import { Schema } from 'prosemirror-model'

export const schema = new Schema({
  nodes: {
    doc: {
      content: 'block+'
    },
    paragraph: {
      content: 'inline*',
      group: 'block',
      toDOM: () => ['p', 0],
      parseDOM: [{ tag: 'p' }]
    },
    text: {
      group: 'inline'
    },
    heading: {
      attrs: {
        level: { default: 1 }
      },
      content: 'inline*',
      group: 'block',
      defining: true,
      toDOM(node) {
        const tag = `h${node.attrs.level}`
        return [tag, 0]
      },
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
      content: 'block+',
      group: 'block',
      defining: true,
      toDOM() {
        return ['blockquote', 0]
      },
      parseDOM: [{ tag: 'blockquote' }]
    },
    ordered_list: {
      content: 'list_item+',
      group: 'block',
      toDOM() {
        return ['ol', 0]
      },
      parseDOM: [{ tag: 'ol' }]
    },
    bullet_list: {
      content: 'list_item+',
      group: 'block',
      toDOM() {
        return ['ul', 0]
      },
      parseDOM: [{ tag: 'ul' }]
    },
    list_item: {
      content: 'paragraph',
      defining: true,
      toDOM() {
        return ['li', 0]
      },
      parseDOM: [{ tag: 'li' }]
    }
  },
  marks: {
    strong: {
      toDOM() {
        return ['strong', 0]
      },
      parseDOM: [{ tag: 'strong' }]
    },
    italic: {
      toDOM() {
        return ['em', 0]
      },
      parseDOM: [{ tag: 'em' }]
    },
    underline: {
      toDOM() {
        return ['span', { class: 'underline' }, 0]
      },
      parseDOM: [{ tag: 'span.underline' }]
    },
    strikethrough: {
      toDOM() {
        return ['del', 0]
      },
      parseDOM: [{ tag: 'del' }]
    },
    highlight: {
      toDOM() {
        return ['mark', 0]
      },
      parseDOM: [{ tag: 'mark' }]
    }
  }
})
