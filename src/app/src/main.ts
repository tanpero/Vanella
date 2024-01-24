import './styles/main.scss'
import './title-bar-controllers'
import { run } from './markdown-editor'

import { unified } from 'unified'

import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import remarkMath from 'remark-math'

import rehypeStringify from 'rehype-stringify'
import rehypeSlug from 'rehype-slug'
import rehypeDocument from 'rehype-document'
import rehypeToc from 'rehype-toc'
import rehypeFormat from 'rehype-format'
import remarkRetext from 'remark-retext'
import retextEmoji from 'retext-emoji'
import retextStringify from 'retext-stringify'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import rehypeMathjax from 'rehype-mathjax'

import 'highlight.js/styles/monokai.css'

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeDocument, {title: ''})
  .use(rehypeSlug)
  .use(rehypeSanitize)
  .use(rehypeHighlight)
  .use(rehypeMathjax)
  .use(rehypeToc)
  .use(rehypeFormat)
  .use(rehypeStringify)

run('#editor', '#viewer', (markdown: string) => String(processor.processSync(markdown)))

