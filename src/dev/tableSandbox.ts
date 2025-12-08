import { schema } from '@/modes/classic/schema'
import { markdownToPmDoc, pmDocToMarkdown } from '@/markdown/convert'

export async function runTableSandbox() {
  const md = `| H1 | H2 |
| :--- | ---: |
| a | b |`
  const doc = await markdownToPmDoc(schema as any, md)
  const back = await pmDocToMarkdown(doc as any)
  return { md, back }
}

