import { useEditorStore } from '@/stores/editorStore'
import ClassicEditor from '@/modes/classic/ClassicEditor'
import SourceEditor from '@/modes/source/SourceEditor'
import ContextMenu from '@/components/ContextMenu'
import InsertImageCard from '@/components/InsertImageCard'

export default function EditorShell() {
  const { editorMode } = useEditorStore()
  return (
    <div style={{ height: '100%', width: '100%' }}>
      {editorMode === 'classic' ? <ClassicEditor /> : <SourceEditor />}
      <ContextMenu />
      <InsertImageCard />
    </div>
  )
}
