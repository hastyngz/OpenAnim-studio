import { useState } from 'react'
import { Circle, Clipboard, Download, FileImage, GitBranch, Hand, MousePointer2, PenLine, Redo2, RectangleHorizontal, Save, Settings, Type, Undo2, X } from 'lucide-react'
import { useStudioStore } from '../../store/useStudioStore'
import { createRenderNotebook, serializeStudioProject } from '../../utils/colabExport'

function downloadText(filename: string, content: string, mimeType: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = URL.createObjectURL(new Blob([content], { type: mimeType }))
  link.click()
  URL.revokeObjectURL(link.href)
}

function ColabExportModal({ onClose }: { onClose: () => void }) {
  const state = useStudioStore()
  const projectJson = JSON.stringify(serializeStudioProject(state), null, 2)
  const notebookJson = JSON.stringify(createRenderNotebook(projectJson), null, 2)
  const copyProject = () => { void navigator.clipboard?.writeText(projectJson) }
  return <div className="export-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="export-modal" role="dialog" aria-modal="true" aria-labelledby="colab-export-title"><div className="export-modal-header"><div><span className="eyebrow">Pipeline package</span><h2 id="colab-export-title">Export to Colab Render</h2></div><button type="button" className="icon-button" title="Close export dialog" onClick={onClose}><X size={17} /></button></div><p className="export-description">Your animation schema includes layers, vectors, easing, audio timestamps, and TTS settings. Upload the project JSON and media files alongside the generated notebook in Google Colab.</p><div className="export-preview"><div className="export-preview-head"><span>studio_project.json</span><button type="button" className="copy-button" onClick={copyProject}><Clipboard size={13} /> Copy JSON</button></div><textarea readOnly value={projectJson} aria-label="Serialized studio project" /></div><div className="export-actions"><button type="button" className="secondary-export" onClick={() => downloadText('studio_project.json', projectJson, 'application/json')}>Download Project JSON</button><button type="button" className="export-button" onClick={() => downloadText('render_pipeline.ipynb', notebookJson, 'application/x-ipynb+json')}><Download size={14} /> Download Colab Notebook</button></div></section></div>
}

export function Toolbar() {
  const { activeSceneId, activeTool, scenes, setActiveTool } = useStudioStore()
  const [showColabExport, setShowColabExport] = useState(false)
  const activeScene = scenes.find((scene) => scene.id === activeSceneId)
  const exportFrame = () => {
    const canvas = document.querySelector('.canvas-frame canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'openanim-frame.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  return <header className="topbar">
    <div className="brand">open<span>anim</span></div>
    <div className="project-name">Untitled sequence / {activeScene?.name ?? 'Scene 01'}</div>
    <div className="top-actions">
      <button type="button" className="icon-button" title="Undo"><Undo2 size={15} /></button>
      <button type="button" className="icon-button" title="Redo"><Redo2 size={15} /></button>
      <button type="button" className="icon-button" title="Save project"><Save size={15} /></button>
      <span className="tool-divider" />
      <button type="button" className={`tool-button ${activeTool === 'select' ? 'active' : ''}`} title="Select tool" onClick={() => setActiveTool('select')}><MousePointer2 size={15} /></button>
      <button type="button" className="tool-button" title="Pan canvas"><Hand size={15} /></button>
      <button type="button" className={`tool-button ${activeTool === 'rectangle' ? 'active' : ''}`} title="Draw rectangle" onClick={() => setActiveTool('rectangle')}><RectangleHorizontal size={15} /></button>
      <button type="button" className={`tool-button ${activeTool === 'circle' ? 'active' : ''}`} title="Draw circle" onClick={() => setActiveTool('circle')}><Circle size={15} /></button>
      <button type="button" className={`tool-button ${activeTool === 'text' ? 'active' : ''}`} title="Add text" onClick={() => setActiveTool('text')}><Type size={15} /></button>
      <button type="button" className={`tool-button ${activeTool === 'pen' ? 'active' : ''}`} title="Pen path editor" onClick={() => setActiveTool('pen')}><PenLine size={15} /></button>
      <button type="button" className={`tool-button ${activeTool === 'bone' ? 'active' : ''}`} title="Bone rig tool" onClick={() => setActiveTool('bone')}><GitBranch size={15} /></button>
      <button type="button" className="icon-button" title="Settings"><Settings size={15} /></button>
      <button type="button" className="icon-button" title="Export frame as PNG" onClick={exportFrame}><FileImage size={15} /></button>
      <button type="button" className="export-button" title="Animation export placeholder" onClick={() => window.alert('GIF/WebM export is ready for encoder integration.')}><Download size={14} /> Export animation</button>
      <button type="button" className="colab-button" title="Export project and render notebook for Google Colab" onClick={() => setShowColabExport(true)}>Colab Render</button>
    </div>
    {showColabExport && <ColabExportModal onClose={() => setShowColabExport(false)} />}
  </header>
}