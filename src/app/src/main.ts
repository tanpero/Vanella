import './styles/main.scss'
import './title-bar-controllers'
import { run } from './markdown-editor'


import { stream } from 'unified-stream'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeStringify)

run('#editor', '#viewer', (markdown: string) => String(processor.processSync(markdown)))

