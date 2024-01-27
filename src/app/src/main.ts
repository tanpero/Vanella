import './styles/main.scss'
import './title-bar-controllers'
import { download, run, upload } from './markdown-editor'

import { unified } from 'unified'

import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import remarkToc from 'remark-toc'
import remarkMath from 'remark-math'
import remarkImages from 'remark-images'
import remarkUnwrapImages from 'remark-unwrap-images'
import remarkGfm from 'remark-gfm'

import rehypeStringify from 'rehype-stringify'
import rehypeSlug from 'rehype-slug'
import rehypeDocument from 'rehype-document'
import rehypeFormat from 'rehype-format'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import rehypeMathjax from 'rehype-mathjax'

import generateTOC from './table-of-contents-generator'

import 'highlight.js/styles/monokai.css'
import ShortcutListener from './shortcut-listener'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkImages)
  .use(remarkUnwrapImages)
  .use(generateTOC(6))

  .use(remarkRehype)
  .use(rehypeDocument, {title: ''})
  .use(rehypeSlug)
  .use(rehypeSanitize)
  .use(rehypeHighlight)
  .use(rehypeMathjax)
  .use(rehypeFormat)
  .use(rehypeStringify)

declare const vanella: any

run('#editor', '#viewer', (markdown: string) => String(processor.processSync(markdown)))

vanella.bindFileManipulation({
  'file-content': content => upload(content),
  'file-saved': path => console.log(path),
  'file-save-error': info => alert(info),
  'save-as-file-dialog-reply': path => console.log(path)
})


const shortcut = new ShortcutListener

shortcut.when('Ctrl O').to(() => vanella.openFile())
shortcut.when('Ctrl S').to(() => vanella.saveFile(download()))
shortcut.when('Ctrl Shift S').to(() => vanella.saveAsFile(download()))
