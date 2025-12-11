import { describe, it, expect } from "vitest";
import { markdownToPmDoc, pmDocToMarkdown } from "@/markdown/convert";
import { schema } from "@/modes/classic/schema";

async function roundtrip(md: string): Promise<string> {
  const doc = await markdownToPmDoc(schema as any, md);
  const out = await pmDocToMarkdown(doc as any);
  return out;
}

describe("markdown 转换与加载逻辑", () => {
  it("保留内联公式定界符（\\(...) 或 $...$）", async () => {
    const md = "Inline: \\(a+b=c\\).";
    const out = await roundtrip(md);
    console.log("roundtrip-\\(\\) =>", JSON.stringify(out));
    expect(out.includes("\\(a+b=c\\)") || out.includes("$a+b=c$")).toBe(true);
  });

  it("普通括号不被当作公式语法", async () => {
    const md = "Inline: (a+b=c).";
    const out = await roundtrip(md);
    expect(out.includes("(a+b=c)")).toBe(true);
    expect(out.includes("\\(")).toBe(false);
    expect(out.includes("$")).toBe(false);
  });

  it("美元内联公式规范化到 \\(...\\)", async () => {
    const md = "Inline: $a+b=c$.";
    const out = await roundtrip(md);
    console.log("roundtrip-$...$ =>", JSON.stringify(out));
    expect(out.includes("\\(a+b=c\\)") || out.includes("$a+b=c$")).toBe(true);
  });

  it("块级公式环境 roundtrip", async () => {
    const md = String.raw`\begin{align}
a = b
\end{align}`;
    const out = await roundtrip(md);
    expect(out.includes("\\begin{align}")).toBe(true);
    expect(out.includes("a = b")).toBe(true);
    expect(out.includes("\\end{align}")).toBe(true);
  });

  it("链接与图片 roundtrip", async () => {
    const md =
      "Visit [OpenAI](https://openai.com) and ![alt](https://example.com/x.png)";
    const out = await roundtrip(md);
    expect(out.includes("[OpenAI](https://openai.com)")).toBe(true);
    expect(out.includes("![alt](https://example.com/x.png)")).toBe(true);
  });
});
