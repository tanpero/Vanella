import { Plugin } from 'unified';
import { Parent, Node } from 'unist';
import { visit } from 'unist-util-visit';

interface MermaidNode extends Node {
  lang: string;
  value: string;
}

const myRehypeMermaid: Plugin = () => {
  return (tree) => {
    visit(tree, 'element', (node: Parent, index: number, parent: Parent | undefined) => {
      if (
        node.tagName === 'pre' &&
        node.properties &&
        node.properties.className &&
        Array.isArray(node.properties.className) &&
        node.properties.className.includes('hljs') &&
        node.properties.className.includes('language-mermaid') &&
        node.children &&
        node.children.length === 1 &&
        node.children[0].type === 'element' &&
        node.children[0].tagName === 'code'
      ) {
        const codeElement = node.children[0];

        // Update properties of parent pre element
        node.tagName = 'pre';
        node.properties.className = ['mermaid'];

        // Update code element
        codeElement.tagName = 'pre';
        codeElement.properties = { className: ['mermaid'], ...codeElement.properties };
      }
    });
  };
};

export default myRehypeMermaid;
