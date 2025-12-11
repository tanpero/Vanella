import React from "react";
import MarkdownEditor from "@/components/MarkdownEditor";
import { useEditorStore } from "@/stores/editorStore";

export default function SourceEditor() {
  const ref = React.useRef<{
    insertSyntax: (s: string, p?: string) => void;
    selectRange: (from: number, to: number) => void;
  }>(null);
  const { setEditorRef } = useEditorStore();
  React.useEffect(() => {
    setEditorRef(ref.current);
    return () => setEditorRef(null);
  }, [setEditorRef]);
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <MarkdownEditor ref={ref} />
    </div>
  );
}
