import { useEditorStore } from '@/stores/editorStore'
import ClassicEditor from '@/modes/classic/ClassicEditor'
import SourceEditor from '@/modes/source/SourceEditor'
import ContextMenu from '@/components/ContextMenu'
import InsertImageCard from '@/components/InsertImageCard'
import InsertTableDialog from '@/components/InsertTableDialog'
import TableToolbar from '@/modes/classic/ui/TableToolbar'
import SearchToolbar from '@/components/SearchToolbar'

export default function EditorShell() {
  const { editorMode } = useEditorStore()
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <SearchToolbar />
      {editorMode === 'classic' ? <ClassicEditor /> : <SourceEditor />}
      <ContextMenu />
      <InsertImageCard />
      <InsertTableDialog />
      <TableToolbar />
    </div>
  )
}
