import rehypeHighlight from 'rehype-highlight'
import { visit } from 'unist-util-visit'

export const highlight = {
  plugins: [
    [
      rehypeHighlight,
      {
        ignoreMissing: true, // 忽略缺失的语言文件
        subsetLanguages: [], // 可选，如果您只需要部分语言，可以在这里指定
        plainText: ['txt', 'text', 'plaintext'], // 可选，将指定的语言渲染为纯文本而不是代码高亮
        theme: 'prism-monokai', // 设置主题为 Monokai
      },
    ],
  ],
}
