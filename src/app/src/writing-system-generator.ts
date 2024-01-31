import { visit } from 'unist-util-visit'
import { u } from 'unist-builder'

export default function attacher() {
  return transformer;

  function transformer(tree) {
    visit(tree, 'text', visitor);
  }

  function visitor(node, index, parent) {
    // 中日韩文字范围的正则表达式
    const cjkRegex = /[\u4E00-\u9FFF\u3040-\u30FF\u31F0-\u31FF\u3200-\u32FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
    // （扩展的）拉丁、（扩展的）西里尔和（扩展的）希腊字母范围的正则表达式
    const lgcRegex = /[\u0100-\u024F\u1E00-\u1EFF\u0400-\u04FF\u0500-\u052F\u1C80-\u1C8F\u1D00-\u1D7F\u1D80-\u1DBF\u1E00-\u1EFF\u1F00-\u1FFF]/;

    // 如果文本中包含中日韩文字，则用 <span class="cjk"> 包裹
    if (cjkRegex.test(node.value)) {
      parent.children[index] = u('element', {tagName: 'span', properties: {class: 'cjk'}}, [u('text', node.value)]);
    }

    // 如果文本中包含（扩展的）拉丁、（扩展的）西里尔和（扩展的）希腊字母，则用 <span class="lgc"> 包裹
    if (lgcRegex.test(node.value)) {
      parent.children[index] = u('element', {tagName: 'span', properties: {class: 'lgc'}}, [u('text', node.value)]);
    }
  }
};
