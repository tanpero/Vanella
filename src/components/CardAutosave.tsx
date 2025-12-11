import { useEffect, useRef } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useCardStore } from "@/stores/cardStore";

export default function CardAutosave() {
  const { markdownSource, editorState, sidebarMode } = useEditorStore();
  const { activeCard, saveActiveCard } = useCardStore();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (sidebarMode !== "cards") return;
    if (!activeCard) return;
    const content = markdownSource || "";
    if (content === activeCard.content) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void saveActiveCard(content);
    }, 300);
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [markdownSource, editorState, sidebarMode, activeCard, saveActiveCard]);

  return null;
}
