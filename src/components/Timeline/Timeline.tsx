import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff, Lock, LockOpen, Pause, Play, Plus, Repeat2, SkipBack, SkipForward } from 'lucide-react'
import { useStudioStore } from '../../store/useStudioStore'
import type { AudioTrack as AudioTrackModel, StudioAsset } from '../../types/studio'
import type { EasingType } from '../../types/studio'

function AudioTrackPlayer({ track, asset, currentFrame, fps, isPlaying, playbackSpeed }: { track: AudioTrackModel, asset: StudioAsset, currentFrame: number, fps: number, isPlaying: boolean, playbackSpeed: 0.5 | 1 | 2 }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const offset = Math.max(0, (currentFrame - track.startFrame) / fps)
    if (Math.abs(audio.currentTime - offset) > 0.08) audio.currentTime = offset
    audio.playbackRate = playbackSpeed
    if (isPlaying && track.visible && currentFrame >= track.startFrame) void audio.play()
    else audio.pause()
  }, [currentFrame, fps, isPlaying, playbackSpeed, track.startFrame, track.visible])
  return <audio ref={audioRef} src={asset.url} preload="auto" />
}

function EasingEditor({ easing, customBezier, onChange }: { easing: EasingType, customBezier?: [number, number, number, number], onChange: (easing: EasingType, customBezier?: [number, number, number, number]) => void }) {
  const bezier = customBezier ?? [0.25, 0.1, 0.75, 0.9]
  const graphPath = easing === 'bounce' ? 'M 8 92 C 22 92 28 64 42 68 C 55 72 58 38 70 45 C 82 52 88 12 96 8' : easing === 'elastic' ? 'M 8 92 C 15 102 22 62 34 76 C 46 90 54 26 66 48 C 78 70 88 4 96 8' : `M 8 92 C ${8 + bezier[0] * 88} ${92 - bezier[1] * 84}, ${8 + bezier[2] * 88} ${92 - bezier[3] * 84}, 96 8`
  return <div className="easing-editor"><div className="easing-editor-head"><span>Easing Curve</span><select value={easing} onChange={(event) => onChange(event.target.value as EasingType)}><option value="linear">Linear</option><option value="ease-in">Ease-In</option><option value="ease-out">Ease-Out</option><option value="ease-in-out">Ease-In-Out</option><option value="elastic">Elastic</option><option value="bounce">Bounce</option><option value="custom">Custom Bezier</option></select></div><svg className="easing-graph" viewBox="0 0 104 100" aria-label="Easing curve graph"><path d="M 8 92 L 96 8" className="easing-axis" /><path d={graphPath} className="easing-curve" /></svg>{easing === 'custom' && <div className="bezier-inputs">{(['C1 X', 'C1 Y', 'C2 X', 'C2 Y'] as const).map((label, index) => <label key={label}><span>{label}</span><input type="range" min="0" max="1" step="0.01" value={bezier[index]} onChange={(event) => { const next = [...bezier] as [number, number, number, number]; next[index] = Number(event.target.value); onChange('custom', next) }} /></label>)}</div>}</div>
}

export function Timeline() {
  const { activeSceneId, addCameraKeyframe, addScene, addKeyframe, addAudioTrack, assets, audioTracks, currentFrame, deleteScene, duplicateScene, fps, isPlaying, layers, loop, playbackSpeed, reorderScene, scenes, selectedLayerId, setCurrentFrame, setFps, setKeyframeEasing, setPlaybackSpeed, switchScene, toggleAudioLock, toggleAudioVisibility, toggleLayerLock, toggleLayerVisibility, toggleLoop, togglePlaying } = useStudioStore()
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId)
  const selectedKeyframe = selectedLayer?.keyframes.find((keyframe) => keyframe.frame === currentFrame)
  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    const assetId = event.dataTransfer.getData('application/x-openanim-asset')
    const asset = assets.find((item) => item.id === assetId)
    if (asset?.type === 'audio') addAudioTrack(asset.id)
  }
  const trackControls = (visible: boolean, locked: boolean, onVisibility: () => void, onLock: () => void) => <span className="track-controls"><button type="button" title={visible ? 'Hide track' : 'Show track'} onClick={onVisibility}>{visible ? <Eye size={13} /> : <EyeOff size={13} />}</button><button type="button" title={locked ? 'Unlock track' : 'Lock track'} onClick={onLock}>{locked ? <Lock size={12} /> : <LockOpen size={12} />}</button></span>
  return <section className="timeline" aria-label="Timeline editor" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
    <div className="timeline-top"><div className="playback"><button type="button" title="First frame" onClick={() => setCurrentFrame(0)}><SkipBack size={15} /></button><button type="button" title="Previous frame" onClick={() => setCurrentFrame(currentFrame - 1)}><ChevronLeft size={17} /></button><button type="button" className="play" title={isPlaying ? 'Pause' : 'Play'} onClick={togglePlaying}>{isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}</button><button type="button" title="Next frame" onClick={() => setCurrentFrame(currentFrame + 1)}><ChevronRight size={17} /></button><button type="button" title="Last frame" onClick={() => setCurrentFrame(96)}><SkipForward size={15} /></button><span className="frame-readout">{String(currentFrame).padStart(2, '0')} : 04 : 00</span></div><div className="timeline-meta"><button type="button" className="keyframe-button" disabled={!selectedLayerId} onClick={() => addKeyframe(selectedLayerId, currentFrame)}><Plus size={13} /> Add Keyframe</button><button type="button" className="keyframe-button secondary" onClick={() => addCameraKeyframe(currentFrame)}><Plus size={13} /> Camera</button><span className="speed-control">{([0.5, 1, 2] as const).map((speed) => <button type="button" key={speed} className={playbackSpeed === speed ? 'selected' : ''} onClick={() => setPlaybackSpeed(speed)}>{speed}x</button>)}</span><button type="button" className={`loop-button ${loop ? 'selected' : ''}`} title="Loop playback" onClick={toggleLoop}><Repeat2 size={14} /></button><label>FPS <input className="fps-input" type="number" min="1" max="60" value={fps} onChange={(event) => setFps(Number(event.target.value))} /></label><span>24.0s</span></div></div>
    <div className="scene-strip" aria-label="Scene management">
      <span className="scene-label">Scenes</span>
      {scenes.map((scene, index) => <div key={scene.id} className={`scene-pill ${activeSceneId === scene.id ? 'active' : ''}`}><button type="button" onClick={() => switchScene(scene.id)}>{scene.name}</button><button type="button" className="mini-button" title="Duplicate scene" onClick={() => duplicateScene(scene.id)}>⧉</button><button type="button" className="mini-button" title="Move scene left" onClick={() => reorderScene(scene.id, -1)} disabled={index === 0}>↑</button><button type="button" className="mini-button" title="Move scene right" onClick={() => reorderScene(scene.id, 1)} disabled={index === scenes.length - 1}>↓</button><button type="button" className="mini-button" title="Delete scene" onClick={() => deleteScene(scene.id)} disabled={scenes.length === 1}>×</button></div>)}
      <button type="button" className="scene-add" onClick={addScene}><Plus size={12} /> Add scene</button>
    </div>
    <div className="timeline-ruler"><div className="ruler-labels"><span>00</span><span>12</span><span>24</span><span>36</span><span>48</span><span>60</span><span>72</span><span>84</span><span>96</span></div></div>
    {layers.map((layer) => <div className="timeline-track" key={layer.id}><span className="track-label"><span>{layer.name}</span>{trackControls(layer.visible, layer.locked, () => toggleLayerVisibility(layer.id), () => toggleLayerLock(layer.id))}</span><div className="track-lane">{layer.keyframes.map((keyframe) => <i className="keyframe" key={`${layer.id}-${keyframe.frame}`} style={{ left: `${(keyframe.frame / 96) * 100}%` }} />)}{layer.lipSync?.map((event) => <i className="viseme-marker" key={`${layer.id}-viseme-${event.frame}`} title={`${event.viseme} mouth shape`} style={{ left: `${(event.frame / 96) * 100}%` }}>{event.viseme}</i>)}</div></div>)}
    {audioTracks.map((track) => { const asset = assets.find((item) => item.id === track.assetId); return <div className="timeline-track audio-track" key={track.id}><span className="track-label"><span>{track.name}</span>{trackControls(track.visible, track.locked, () => toggleAudioVisibility(track.id), () => toggleAudioLock(track.id))}</span><div className="track-lane"><span className="audio-clip" style={{ left: `${(track.startFrame / 96) * 100}%` }}>AUDIO</span></div>{asset && <AudioTrackPlayer track={track} asset={asset} currentFrame={currentFrame} fps={fps} isPlaying={isPlaying} playbackSpeed={playbackSpeed} />}</div> })}
    {selectedLayer && selectedKeyframe && <EasingEditor easing={selectedKeyframe.easing ?? 'linear'} customBezier={selectedKeyframe.customBezier} onChange={(easing, customBezier) => setKeyframeEasing(selectedLayer.id, currentFrame, easing, customBezier)} />}
    <div className="playhead" style={{ left: `calc(132px + (100% - 172px) * ${currentFrame / 96})` }} /><input className="frame-slider" aria-label="Current frame" type="range" min="0" max="96" value={currentFrame} onChange={(event) => setCurrentFrame(Number(event.target.value))} style={{ left: '132px', width: 'calc(100% - 172px)', top: '55px', height: '120px' }} />
  </section>
}