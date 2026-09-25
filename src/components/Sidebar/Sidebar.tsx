import { useState } from 'react'
import { AudioLines, Eye, EyeOff, Image, Lock, LockOpen, Mic2, Plus, Shapes, Type, Upload, UserRound } from 'lucide-react'
import { useStudioStore } from '../../store/useStudioStore'
import { interpolateLayerProperties } from '../../store/useStudioStore'
import type { StudioAsset } from '../../types/studio'

function createSilentWav(durationSeconds: number) {
  const sampleRate = 8000
  const sampleCount = Math.max(1, Math.floor(sampleRate * durationSeconds))
  const buffer = new ArrayBuffer(44 + sampleCount * 2)
  const view = new DataView(buffer)
  const write = (offset: number, value: string) => Array.from(value).forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)))
  write(0, 'RIFF'); view.setUint32(4, 36 + sampleCount * 2, true); write(8, 'WAVE'); write(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, sampleCount * 2, true)
  return new Blob([buffer], { type: 'audio/wav' })
}

function VoiceoverPanel() {
  const { fps, tts, layers, selectedLayerId, setTts, addAsset, addAudioTrack, generateLipSync, setTotalFrames } = useStudioStore()
  const generateVoiceover = () => {
    const script = tts.script.trim()
    if (!script) return
    const durationSeconds = Math.max(1, script.split(/\s+/).length / (2.5 * tts.rate))
    const durationFrames = Math.ceil(durationSeconds * fps)
    const utterance = new SpeechSynthesisUtterance(script)
    utterance.pitch = tts.pitch
    utterance.rate = tts.rate
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find((voice) => tts.voice === 'female' ? /female|samantha|zira|victoria|susan/i.test(voice.name) : /male|daniel|alex|david|mark/i.test(voice.name))
    if (preferredVoice) utterance.voice = preferredVoice
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    const asset: StudioAsset = { id: `tts-${Date.now()}`, name: 'Generated voiceover.wav', type: 'audio', mimeType: 'audio/wav', url: URL.createObjectURL(createSilentWav(durationSeconds)), size: Math.round(durationSeconds * 16000) }
    addAsset(asset)
    addAudioTrack(asset.id, { durationFrames, kind: 'tts' })
    setTts({ durationFrames })
    if (layers.find((layer) => layer.id === selectedLayerId)?.characterPart === 'head') generateLipSync(selectedLayerId, durationFrames)
    setTotalFrames(Math.max(useStudioStore.getState().totalFrames, useStudioStore.getState().currentFrame + durationFrames))
  }
  return <section className="voiceover-panel"><div className="voiceover-intro"><Mic2 size={18} /><div><strong>Voiceover &amp; Script</strong><small>Browser speech preview + timeline cue</small></div></div><textarea className="script-input" value={tts.script} onChange={(event) => setTts({ script: event.target.value })} placeholder="Paste narration or dialogue here..." rows={8} /><div className="voice-controls"><label>Voice<select value={tts.voice} onChange={(event) => setTts({ voice: event.target.value as 'male' | 'female' })}><option value="female">Female</option><option value="male">Male</option></select></label><label>Pitch<input type="range" min="0.5" max="1.5" step="0.05" value={tts.pitch} onChange={(event) => setTts({ pitch: Number(event.target.value) })} /></label><label>Rate<input type="range" min="0.5" max="2" step="0.05" value={tts.rate} onChange={(event) => setTts({ rate: Number(event.target.value) })} /></label></div><button type="button" className="generate-voiceover" onClick={generateVoiceover}><Mic2 size={14} /> Generate Voiceover</button><button type="button" className="lip-sync-button" disabled={!tts.durationFrames || !selectedLayerId} onClick={() => generateLipSync(selectedLayerId)}><UserRound size={14} /> Generate Lip-Sync Events</button><p className="voiceover-note">Estimated duration is {tts.durationFrames ? `${(tts.durationFrames / fps).toFixed(1)}s` : 'not generated yet'}. Select a character head layer before generating visemes.</p></section>
}

export function Sidebar() {
  const [panel, setPanel] = useState<'layers' | 'voiceover'>('layers')
  const { assets, bones, characterPresets, currentFrame, layers, selectedLayerId, selectLayer, toggleLayerLock, toggleLayerVisibility, updateLayerProperties, setLayerBone, addAsset, addAudioTrack, requestAssetPlacement, requestCharacterPlacement } = useStudioStore()
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId)
  const properties = selectedLayer ? interpolateLayerProperties(selectedLayer, currentFrame) : {}
  const importFiles = (files: FileList | null) => {
    Array.from(files ?? []).forEach((file) => {
      const type = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg') ? 'svg' : file.type.startsWith('audio/') || /\.(mp3|wav)$/i.test(file.name) ? 'audio' : file.type.startsWith('image/') ? 'image' : null
      if (!type) return
      const asset: StudioAsset = { id: `asset-${Date.now()}-${file.name}`, name: file.name, type, mimeType: file.type, url: URL.createObjectURL(file), size: file.size }
      addAsset(asset)
      if (type === 'audio') addAudioTrack(asset.id)
    })
  }
  const placeAsset = (asset: StudioAsset) => asset.type === 'audio' ? addAudioTrack(asset.id) : requestAssetPlacement(asset.id)
  const propertyField = (label: string, property: 'x' | 'y' | 'scaleX' | 'scaleY' | 'rotation' | 'opacity') => <label className="property-field" key={property}><span>{label}</span><input type="number" step={property === 'opacity' ? '0.1' : '1'} min={property === 'opacity' ? '0' : undefined} max={property === 'opacity' ? '1' : undefined} value={Number((properties[property] ?? (property.includes('scale') ? 1 : property === 'opacity' ? 1 : 0)).toFixed(2))} onChange={(event) => updateLayerProperties(selectedLayerId, { [property]: Number(event.target.value) })} /></label>
  return <aside className="sidebar">
    <div className="sidebar-tabs"><button type="button" className={panel === 'layers' ? 'selected' : ''} onClick={() => setPanel('layers')}>Layers &amp; Assets</button><button type="button" className={panel === 'voiceover' ? 'selected' : ''} onClick={() => setPanel('voiceover')}>Voiceover &amp; Script</button></div>
    {panel === 'voiceover' ? <VoiceoverPanel /> : <>
    <section>
      <div className="panel-heading"><h2 className="panel-title">Layers</h2><button type="button" className="panel-action" title="Add layer"><Plus size={16} /></button></div>
      <div className="layer-list">{layers.map((layer) => <div key={layer.id} className={`layer-row ${selectedLayerId === layer.id ? 'selected' : ''}`}>
        <button type="button" onClick={() => selectLayer(layer.id)} title={`Select ${layer.name}`}>{layer.type === 'text' ? <Type size={14} /> : <Shapes size={14} />}</button>
        <i className="layer-swatch" style={{ backgroundColor: layer.color }} />
        <button type="button" className="layer-name" onClick={() => selectLayer(layer.id)}>{layer.name}</button>
        <button type="button" onClick={() => toggleLayerVisibility(layer.id)} title={layer.visible ? 'Hide layer' : 'Show layer'}>{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
        <button type="button" onClick={() => toggleLayerLock(layer.id)} title={layer.locked ? 'Unlock layer' : 'Lock layer'}>{layer.locked ? <Lock size={13} /> : <LockOpen size={13} />}</button>
      </div>)}</div>
    </section>
    <div className="sidebar-divider" />
    <section><div className="panel-heading"><h2 className="panel-title">Properties</h2><span className="property-frame">F{String(currentFrame).padStart(2, '0')}</span></div><div className="property-grid">{propertyField('X', 'x')}{propertyField('Y', 'y')}{propertyField('Scale X', 'scaleX')}{propertyField('Scale Y', 'scaleY')}{propertyField('Rotation', 'rotation')}{propertyField('Opacity', 'opacity')}</div>{selectedLayer?.type === 'path' && <label className="bone-select">Parent bone<select value={selectedLayer.boneId ?? ''} onChange={(event) => setLayerBone(selectedLayer.id, event.target.value || undefined)}><option value="">None</option>{bones.map((bone) => <option key={bone.id} value={bone.id}>{bone.name}</option>)}</select></label>}</section>
    <div className="sidebar-divider" />
    <section><div className="panel-heading"><h2 className="panel-title">Assets</h2><label className="upload-button" title="Upload SVG, PNG, JPEG, MP3, or WAV"><Upload size={14} /><input type="file" accept="image/svg+xml,image/png,image/jpeg,audio/mpeg,audio/wav" multiple onChange={(event) => importFiles(event.target.files)} />Upload Asset</label></div>
      <div className="asset-grid"><button type="button" className="asset-card" onClick={() => document.querySelector<HTMLInputElement>('.upload-button input')?.click()}><Upload size={19} /><span>Upload media</span></button><button type="button" className="asset-card"><Shapes size={19} /><span>Shapes</span></button>{assets.map((asset) => <button type="button" className="asset-card asset-card-file" key={asset.id} draggable onDragStart={(event) => event.dataTransfer.setData('application/x-openanim-asset', asset.id)} onClick={() => placeAsset(asset)} title={`Place ${asset.name}`}><span className="asset-icon">{asset.type === 'audio' ? <AudioLines size={18} /> : asset.type === 'svg' ? <Type size={18} /> : <Image size={18} />}</span><span>{asset.name}</span><small>{asset.type === 'audio' ? 'Audio track' : 'Place on canvas'}</small></button>)}</div>
    </section>
    <div className="sidebar-divider" />
    <section><div className="panel-heading"><h2 className="panel-title">Character Presets</h2><UserRound size={15} color="var(--mint)" /></div><div className="preset-grid">{characterPresets.map((preset) => <button type="button" className="preset-card" key={preset.id} draggable onDragStart={(event) => event.dataTransfer.setData('application/x-openanim-character', preset.id)} onClick={() => requestCharacterPlacement(preset.id)}><span className="preset-avatar" style={{ background: preset.accent }}><UserRound size={21} /></span><strong>{preset.name}</strong><small>{preset.description}</small><em>Rigged • drop to canvas</em></button>)}</div></section></>}
  </aside>
}