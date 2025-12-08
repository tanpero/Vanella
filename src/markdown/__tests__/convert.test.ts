import { describe, it, expect, vi } from 'vitest'
import { markdownToPmDoc, pmDocToMarkdown } from '@/markdown/convert'
import { schema } from '@/modes/classic/schema'
import { useEditorStore } from '@/stores/editorStore'
import type { FileTreeNode } from '@/types/editor'

async function roundtrip(md: string): Promise<string> {
  const doc = await markdownToPmDoc(schema, md)
  const out = await pmDocToMarkdown(doc)
  return out
}

describe('Markdown 转换逻辑（inline/block math）', () => {
  it('保留 $...$ 形式的内联公式', async () => {
    const md = 'Inline: $a+b=c$.'
    const out = await roundtrip(md)
    expect(out).toContain('$a+b=c$')
  })

  it('保留 \\(...\\) 形式的内联公式', async () => {
    const md = 'Inline: \\(x+y\\).'
    const out = await roundtrip(md)
    expect(out).toContain('\\(x+y\\)')
  })

  it('普通括号 () 不被识别为公式定界符', async () => {
    const md = 'Text with (normal) parentheses.'
    const out = await roundtrip(md)
    expect(out).toContain('(normal)')
    expect(out).not.toMatch(/\$\(normal\)\$/)
  })

  it('保留 $$...$$ 数学块', async () => {
    const md = '$$E=mc^2$$'
    const out = await roundtrip(md)
    expect(out).toMatch(/\$\$[\s\S]*E=mc\^2[\s\S]*\$\$/)
  })
})

describe('Markdown 加载逻辑（读入到 Source 模式）', () => {
  it('openFileNode 读取文件内容并原样设置为 markdownSource', async () => {
    const sample = 'A line with inline math: \\(a+b\\) and $x+y$.'
    vi.mock('@/utils/fsWorkerClient', () => ({
      readFileWorker: vi.fn(async () => sample),
      buildFileTreeWorker: vi.fn()
    }))

    const store = useEditorStore.getState()
    const node: FileTreeNode = {
      type: 'file',
      name: 'sample.md',
      path: '/sample.md',
      handle: {} as unknown as FileSystemFileHandle,
      parent: {} as unknown as FileSystemDirectoryHandle
    }
    await store.openFileNode(node)
    const { markdownSource, activeFile } = useEditorStore.getState()
    expect(markdownSource).toBe(sample)
    expect(activeFile?.content).toBe(sample)
  })
})

