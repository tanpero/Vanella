import { ProseMirrorUnified } from "prosemirror-unified"
import { MarkdownExtension } from "prosemirror-remark"
import { Node as ProseMirrorNode, Schema } from "prosemirror-model"

export class BridgeBetweenMarkdownAndDocument {
    private pmu: ProseMirrorUnified
    private source: ProseMirrorNode | string
  
    constructor() {
      this.pmu = new ProseMirrorUnified([new MarkdownExtension()])
      this.source = ''
    }

    from(source: ProseMirrorNode | string): this {
        this.source = source
        return this
    }
  
    public toDocument(): ProseMirrorNode {
      return this.pmu.parse(this.source as string)
    }
  
    public toMarkdown(): string {
      return this.pmu.serialize(this.source as ProseMirrorNode)
    }

    public getSchema(): Schema {
        return this.pmu.schema()
    }
  }
