import { useState } from 'react'
import { Camera, Circle, Clipboard, Download, ExternalLink, FileImage, GitBranch, Hand, MousePointer2, PenLine, Redo2, RectangleHorizontal, Save, Settings, Type, Undo2, X } from 'lucide-react'
import { useStudioStore } from '../../store/useStudioStore'
import type { RenderPassConfig } from '../../types/studio'
import { createRenderNotebook, serializeStudioProject } from '../../utils/colabExport'

const renderPresets: Record<RenderPassConfig['qualityPreset'], Omit<RenderPassConfig, 'qualityPreset'>> = {
  'web-preview': { resolutionWidth: 1920, resolutionHeight: 1080, transparent: false, bitrate: '12M', codec: 'libx264', pixelFormat: 'yuv420p', engine: 'BLENDER_EEVEE_NEXT', samples: 32, motionBlur: false, depthOfField: false },
  'studio-4k': { resolutionWidth: 3840, resolutionHeight: 2160, transparent: false, bitrate: '45M', codec: 'libx264', pixelFormat: 'yuv420p', engine: 'CYCLES', samples: 128, motionBlur: true, depthOfField: true },
  'transparent-webm': { resolutionWidth: 1920, resolutionHeight: 1080, transparent: true, bitrate: '12M', codec: 'libvpx-vp9', pixelFormat: 'yuva420p', engine: 'BLENDER_EEVEE_NEXT', samples: 64, motionBlur: false, depthOfField: false },
}

function downloadText(filename: string, content: string, mimeType: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = URL.createObjectURL(new Blob([content], { type: mimeType }))
  link.click()
  URL.revokeObjectURL(link.href)
}

function ColabExportModal({ onClose }: { onClose: () => void }) {
  const state = useStudioStore()
  const { renderPass, setRenderPass } = state
  const [copyStatus, setCopyStatus] = useState('')
  const projectJson = JSON.stringify(serializeStudioProject(state), null, 2)
  const notebookJson = JSON.stringify(createRenderNotebook(projectJson), null, 2)
  const copyProject = async () => {
    try {
      await navigator.clipboard.writeText(projectJson)
    } catch {
      const copyArea = document.createElement('textarea')
      copyArea.value = projectJson
      copyArea.style.position = 'fixed'
      copyArea.style.opacity = '0'
      document.body.append(copyArea)
      copyArea.select()
      const copied = document.execCommand('copy')
      copyArea.remove()
      if (!copied) {
        setCopyStatus('Copy failed. Use Download Project JSON instead.')
        return
      }
    }
    setCopyStatus('studio_project.json copied to clipboard')
  }
  return <div className="export-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="export-modal" role="dialog" aria-modal="true" aria-labelledby="colab-export-title">
      <div className="export-modal-header"><div><span className="eyebrow">Pipeline package</span><h2 id="colab-export-title">Export to Colab Render</h2></div><button type="button" className="icon-button" title="Close export dialog" onClick={onClose}><X size={17} /></button></div>
      <p className="export-description">Configure the Blender render pass, then download the project data and Colab notebook.</p>
      <div className="colab-launch-row">
        <a className="colab-launch" href="https://colab.research.google.com/github/hastyngz/OpenAnim-studio" target="_blank" rel="noreferrer" onClick={() => { void copyProject() }}><ExternalLink size={14} /> Launch directly in Google Colab</a>
        <span className="copy-status" aria-live="polite">{copyStatus}</span>
      </div>
      <div className="render-settings">
        <label>Quality preset<select value={renderPass.qualityPreset} onChange={(event) => setRenderPass({ qualityPreset: event.target.value as RenderPassConfig['qualityPreset'], ...renderPresets[event.target.value as RenderPassConfig['qualityPreset']] })}><option value="web-preview">1080p Web Preview</option><option value="studio-4k">4K Studio Render</option><option value="transparent-webm">Transparent WebM Alpha</option></select></label>
        <label>Engine<select value={renderPass.engine} onChange={(event) => setRenderPass({ engine: event.target.value as typeof renderPass.engine })}><option value="BLENDER_EEVEE_NEXT">Eevee</option><option value="CYCLES">Cycles</option></select></label>
        <label>Samples<input type="number" min="1" max="4096" step="16" value={renderPass.samples} onChange={(event) => setRenderPass({ samples: Math.min(4096, Math.max(1, Number(event.target.value))) })} /></label>
        <label className="render-toggle"><input type="checkbox" checked={renderPass.motionBlur} onChange={(event) => setRenderPass({ motionBlur: event.target.checked })} /> Motion blur</label>
        <label className="render-toggle"><input type="checkbox" checked={renderPass.depthOfField} onChange={(event) => setRenderPass({ depthOfField: event.target.checked })} /> Depth of field</label>
      </div>
      <div className="export-preview"><div className="export-preview-head"><span>studio_project.json</span><button type="button" className="copy-button" onClick={() => { void copyProject() }}><Clipboard size={13} /> Copy JSON</button></div><textarea readOnly value={projectJson} aria-label="Serialized studio project" /></div>
      <div className="export-actions"><button type="button" className="secondary-export" onClick={() => downloadText('studio_project.json', projectJson, 'application/json')}>Download Project JSON</button><button type="button" className="export-button" onClick={() => downloadText('render_pipeline.ipynb', notebookJson, 'application/x-ipynb+json')}><Download size={14} /> Download Colab Notebook</button></div>
    </section>
  </div>
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
      <button type="button" className={`tool-button ${activeTool === 'camera' ? 'active' : ''}`} title="Camera tool: drag to pan" onClick={() => setActiveTool('camera')}><Camera size={15} /></button>
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