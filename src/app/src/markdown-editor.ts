import { basicSetup } from 'codemirror'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'

export const run = (el: string) => {
  const doc = `
  # Hello world
  ---
  **Marisa**
  `
  

  return new EditorView({
    doc,
    extensions: [
      basicSetup,
      keymap.of([indentWithTab]),
      markdown()
    ],
    parent: document.querySelector(el) as HTMLDivElement
  })
}
