import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { toString as mdastToString } from "mdast-util-to-string";
import rehypeTableClass from "@/utils/rehype/tableClassPlugin";

export const parseMarkdown = (content: string): string => {
  const file = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkHeadingAnchors)
    .use(remarkMermaid)
    .use(remarkAbc)
    .use(remarkToc)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeTableClass)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .processSync(content);
  return String(file);
};

export const extractTextFromMarkdown = (content: string): string => {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .parse(content) as unknown as { type: string };
  return mdastToString(tree as { type: string });
};

export const getWordCount = (content: string): number => {
  const text = extractTextFromMarkdown(content);
  return text.split(/\s+/).filter((word) => word.length > 0).length;
};

export const getCharacterCount = (content: string): number => {
  return content.length;
};

export const getLineCount = (content: string): number => {
  return content.split("\n").length;
};

export const insertMarkdownSyntax = (
  content: string,
  selectionStart: number,
  selectionEnd: number,
  syntax: string,
  placeholder?: string,
): { newContent: string; newCursorPos: number } => {
  const selectedText = content.slice(selectionStart, selectionEnd);
  const beforeSelection = content.slice(0, selectionStart);
  const afterSelection = content.slice(selectionEnd);

  let newText: string;
  let cursorOffset: number;

  switch (syntax) {
    case "bold":
      newText = `**${selectedText || placeholder || "bold text"}**`;
      cursorOffset = selectedText ? 2 : 2 + (placeholder?.length || 9);
      break;
    case "italic":
      newText = `*${selectedText || placeholder || "italic text"}*`;
      cursorOffset = selectedText ? 1 : 1 + (placeholder?.length || 11);
      break;
    case "code":
      newText = `\`${selectedText || placeholder || "code"}\``;
      cursorOffset = selectedText ? 1 : 1 + (placeholder?.length || 4);
      break;
    case "link":
      newText = `[${selectedText || "link text"}](url)`;
      cursorOffset = selectedText ? selectedText.length + 3 : 12;
      break;
    case "image":
      newText = `![${selectedText || "alt text"}](image-url)`;
      cursorOffset = selectedText ? selectedText.length + 4 : 18;
      break;
    case "heading1":
      newText = `# ${selectedText || placeholder || "Heading"}`;
      cursorOffset = selectedText ? 2 : 2 + (placeholder?.length || 7);
      break;
    case "heading2":
      newText = `## ${selectedText || placeholder || "Heading"}`;
      cursorOffset = selectedText ? 3 : 3 + (placeholder?.length || 7);
      break;
    case "heading3":
      newText = `### ${selectedText || placeholder || "Heading"}`;
      cursorOffset = selectedText ? 4 : 4 + (placeholder?.length || 7);
      break;
    case "bullet":
      newText = `- ${selectedText || placeholder || "List item"}`;
      cursorOffset = selectedText ? 2 : 2 + (placeholder?.length || 9);
      break;
    case "number":
      newText = `1. ${selectedText || placeholder || "List item"}`;
      cursorOffset = selectedText ? 3 : 3 + (placeholder?.length || 9);
      break;
    case "quote":
      newText = `> ${selectedText || placeholder || "Quote"}`;
      cursorOffset = selectedText ? 2 : 2 + (placeholder?.length || 5);
      break;
    default:
      newText = selectedText;
      cursorOffset = 0;
  }

  const newContent = beforeSelection + newText + afterSelection;
  const newCursorPos = selectionStart + cursorOffset;

  return { newContent, newCursorPos };
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

function slugify(input: string, seen: Record<string, number>): string {
  const base = (input || "")
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^a-z0-9\-\u00A0-\uFFFF]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const count = seen[base] || 0;
  seen[base] = count + 1;
  return count ? `${base}-${count}` : base;
}

type MdastData = {
  hProperties?: { id?: string };
  id?: string;
  [k: string]: unknown;
};
type MdastNode = {
  type: string;
  depth?: number;
  children?: MdastNode[];
  data?: MdastData;
  value?: string;
  url?: string;
  lang?: string;
};
type MdastRoot = { type: string; children?: MdastNode[] };

function remarkHeadingAnchors() {
  return (tree: MdastRoot) => {
    const seen: Record<string, number> = {};
    const visit = (node: MdastNode | MdastRoot | undefined) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "heading") {
        const text = mdastToString(node as unknown as { type: string });
        const id = slugify(text, seen);
        const n = node as MdastNode;
        n.data = n.data || {};
        n.data.hProperties = n.data.hProperties || {};
        n.data.id = id;
        n.data.hProperties.id = id;
      }
      const children = (node as MdastNode).children || [];
      for (const child of children) visit(child);
    };
    visit(tree);
  };
}

function remarkToc() {
  return (tree: MdastRoot) => {
    const headings: { depth: number; title: string; id: string }[] = [];
    const visit = (node: MdastNode | MdastRoot | undefined) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "heading") {
        const title = mdastToString(node as unknown as { type: string });
        const data = (node as MdastNode).data;
        const id =
          (data && (data.id || (data.hProperties && data.hProperties.id))) ||
          "";
        headings.push({
          depth: Math.max(1, Math.min(6, (node as MdastNode).depth || 1)),
          title,
          id,
        });
      }
      const children = (node as MdastNode).children || [];
      for (const child of children) visit(child);
    };
    visit(tree);

    const findAndReplaceToc = (
      node: MdastNode | MdastRoot | undefined,
      parent?: MdastRoot | MdastNode,
      idx?: number,
    ) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "paragraph") {
        const text = mdastToString(node as unknown as { type: string })
          .trim()
          .toLowerCase();
        if (text === "[toc]") {
          const html =
            `<div class="pm-toc-block"><ul>` +
            headings
              .map(
                (h) =>
                  `<li data-depth="${h.depth}"><a href="#${h.id}">${escapeHtml(h.title)}</a></li>`,
              )
              .join("") +
            `</ul></div>`;
          const htmlNode: MdastNode = { type: "html", value: html };
          if (parent && typeof idx === "number" && parent.children)
            parent.children[idx] = htmlNode;
          return;
        }
      }
      const children = (node as MdastNode).children || [];
      for (let i = 0; i < children.length; i++)
        findAndReplaceToc(children[i], node as MdastNode, i);
    };
    findAndReplaceToc(tree);
  };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function remarkMermaid() {
  return (tree: MdastRoot) => {
    const visit = (
      node: MdastNode | MdastRoot | undefined,
      parent?: MdastNode | MdastRoot,
      idx?: number,
    ) => {
      if (!node || typeof node !== "object") return;
      if (
        (node as MdastNode).type === "code" &&
        typeof (node as MdastNode).value === "string"
      ) {
        const n = node as MdastNode;
        const lang = n.lang || "";
        if (
          (lang || "").toLowerCase() === "mermaid" &&
          parent &&
          typeof idx === "number" &&
          parent.children
        ) {
          const htmlNode: MdastNode = {
            type: "html",
            value: `<div class="mermaid">\n${n.value || ""}\n</div>`,
          };
          parent.children[idx] = htmlNode;
          return;
        }
      }
      const children = (node as MdastNode).children || [];
      for (let i = 0; i < children.length; i++)
        visit(children[i], node as MdastNode, i);
    };
    visit(tree);
  };
}

function remarkAbc() {
  return (tree: MdastRoot) => {
    const visit = (
      node: MdastNode | MdastRoot | undefined,
      parent?: MdastNode | MdastRoot,
      idx?: number,
    ) => {
      if (!node || typeof node !== "object") return;
      if (
        (node as MdastNode).type === "code" &&
        typeof (node as MdastNode).value === "string"
      ) {
        const n = node as MdastNode;
        const lang = n.lang || "";
        if (
          (lang || "").toLowerCase() === "abc" &&
          parent &&
          typeof idx === "number" &&
          parent.children
        ) {
          const htmlNode: MdastNode = {
            type: "html",
            value: `<div class="abc-block" data-src="${escapeHtml((n.value || "").replace(/"/g, "&quot;"))}"></div>`,
          };
          parent.children[idx] = htmlNode;
          return;
        }
      }
      const children = (node as MdastNode).children || [];
      for (let i = 0; i < children.length; i++)
        visit(children[i], node as MdastNode, i);
    };
    visit(tree);
  };
}
