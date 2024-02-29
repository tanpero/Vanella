
import { ProseMirrorUnified } from 'prosemirror-unified'
import { MarkdownExtension } from 'prosemirror-remark'

import { processorToView as processor } from './markdown-processor'

const pmu = new ProseMirrorUnified([new MarkdownExtension])

export const fromMarkdownToPMDoc = markdown => pmu.parse(markdown)
export const fromPMDocToMarkdown = pmdoc => pmu.serialize(pmdoc)

export const markdownToHTML = markdown => {
  let html = ''
  processor.process(markdown, (err, file) => {
    if (err) throw err
    html = String(file)
  })
  return html
}