import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Canvas as FabricCanvas, Circle, FabricImage, FabricText, Polygon, Rect, type FabricObject } from 'fabric'
import { interpolateCameraKeyframe, interpolateLayerProperties, interpolatePath, useStudioStore } from '../../store/useStudioStore'
import type { Bone, PathPoint } from '../../types/studio'

type LayerObject = FabricObject & { layerId?: string, baseLeft?: number, baseTop?: number }

function pathToD(points: PathPoint[]) {
  if (!points.length) return ''
  return points.slice(1).reduce((d, point, index) => {
    const previous = points[index]
    if (previous.outHandle || point.inHandle) return `${d} C ${previous.outHandle?.x ?? previous.x} ${previous.outHandle?.y ?? previous.y}, ${point.inHandle?.x ?? point.x} ${point.inHandle?.y ?? point.y}, ${point.x} ${point.y}`
    return `${d} L ${point.x} ${point.y}`
  }, `M ${points[0].x} ${points[0].y}`)
}

function boneWorld(bone: Bone, bones: Bone[]): { x: number, y: number, rotation: number } {
  if (!bone.parentId) return { x: bone.x, y: bone.y, rotation: bone.rotation }
  const parent = bones.find((item) => item.id === bone.parentId)
  if (!parent) return { x: bone.x, y: bone.y, rotation: bone.rotation }
  const parentWorld = boneWorld(parent, bones)
  const radians = parentWorld.rotation * Math.PI / 180
  return { x: parentWorld.x + Math.cos(radians) * parent.length, y: parentWorld.y + Math.sin(radians) * parent.length, rotation: parentWorld.rotation + bone.rotation }
}

function PathAndBoneOverlay({ activeTool, currentFrame }: { activeTool: string, currentFrame: number }) {
  const { bones, layers, selectedLayerId, addBone, addLayer, selectLayer, setActiveTool, updatePathAtFrame } = useStudioStore()
  const [draft, setDraft] = useState<PathPoint[]>([])
  const [boneDraft, setBoneDraft] = useState<{ x: number, y: number } | null>(null)
  const dragRef = useRef<{ index: number, handle?: 'inHandle' | 'outHandle' } | null>(null)
  const boneDragRef = useRef<string | null>(null)
  const cameraDragRef = useRef<{ point: { x: number, y: number }, camera: { x: number, y: number } } | null>(null)
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId)
  const selectedPath = selectedLayer?.type === 'path' ? interpolatePath(selectedLayer, currentFrame) : []
  const attachedBone = selectedLayer?.boneId ? bones.find((bone) => bone.id === selectedLayer.boneId) : undefined
  const attachedBoneWorld = attachedBone ? boneWorld(attachedBone, bones) : undefined
  const displayPath = attachedBoneWorld ? selectedPath.map((point) => { const radians = attachedBoneWorld.rotation * Math.PI / 180; return { ...point, x: attachedBoneWorld.x + point.x * Math.cos(radians) - point.y * Math.sin(radians), y: attachedBoneWorld.y + point.x * Math.sin(radians) + point.y * Math.cos(radians) } }) : selectedPath
  const points = draft.length ? draft : selectedPath
  const toScenePoint = (event: PointerEvent<SVGSVGElement>) => { const bounds = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - bounds.left) * 800 / bounds.width, y: (event.clientY - bounds.top) * 500 / bounds.height } }
  const updatePoints = (next: PathPoint[]) => { setDraft(next); if (selectedLayer?.type === 'path' && activeTool === 'select') updatePathAtFrame(selectedLayer.id, next) }
  const handleCanvasPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (activeTool === 'camera') {
      const point = toScenePoint(event)
      const camera = interpolateCameraKeyframe(useStudioStore.getState().cameraKeyframes, currentFrame)
      cameraDragRef.current = { point, camera }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (activeTool === 'pen') { setDraft((current) => [...current, { ...toScenePoint(event) }]); return }
    if (activeTool === 'bone') {
      const point = toScenePoint(event)
      if (!boneDraft) setBoneDraft(point)
      else { const length = Math.hypot(point.x - boneDraft.x, point.y - boneDraft.y); const rotation = Math.atan2(point.y - boneDraft.y, point.x - boneDraft.x) * 180 / Math.PI; addBone({ id: `bone-${Date.now()}`, name: `Bone ${bones.length + 1}`, parentId: bones[bones.length - 1]?.id, x: boneDraft.x, y: boneDraft.y, length, rotation, visible: true, locked: false }); setBoneDraft(point) }
    }
  }
  const finishPath = () => { if (draft.length < 2) return; const id = `path-${Date.now()}`; addLayer({ id, name: 'Vector path', type: 'path', visible: true, locked: false, color: '#ef6f51', keyframes: [{ frame: currentFrame, easing: 'linear', path: draft }] }); setDraft([]); setActiveTool('select'); selectLayer(id) }
  const handleMove = (event: PointerEvent<SVGSVGElement>) => { const point = toScenePoint(event); const cameraDrag = cameraDragRef.current; if (cameraDrag) { useStudioStore.getState().updateCameraAtFrame({ x: cameraDrag.camera.x - (point.x - cameraDrag.point.x), y: cameraDrag.camera.y - (point.y - cameraDrag.point.y) }); return } if (boneDragRef.current) { const bone = bones.find((item) => item.id === boneDragRef.current); const start = bone ? boneWorld(bone, bones) : point; if (bone) useStudioStore.getState().updateBone(bone.id, { length: Math.hypot(point.x - start.x, point.y - start.y), rotation: Math.atan2(point.y - start.y, point.x - start.x) * 180 / Math.PI - (bone.parentId ? (boneWorld(bones.find((item) => item.id === bone.parentId)!, bones).rotation) : 0) }); return } const drag = dragRef.current; if (!drag) return; const next = points.map((item, index) => index === drag.index ? drag.handle ? { ...item, [drag.handle]: point } : { ...item, x: point.x, y: point.y } : item); updatePoints(next) }
  const handleUp = () => { dragRef.current = null; boneDragRef.current = null; cameraDragRef.current = null }
  const renderPoints = points.map((point, index) => <g key={`point-${index}`}><circle className="path-point" cx={point.x} cy={point.y} r="5" onPointerDown={(event) => { event.stopPropagation(); dragRef.current = { index } }} />{point.inHandle && <><line className="bezier-handle" x1={point.x} y1={point.y} x2={point.inHandle.x} y2={point.inHandle.y} /><circle className="bezier-control" cx={point.inHandle.x} cy={point.inHandle.y} r="3" onPointerDown={(event) => { event.stopPropagation(); dragRef.current = { index, handle: 'inHandle' } }} /></>}{point.outHandle && <><line className="bezier-handle" x1={point.x} y1={point.y} x2={point.outHandle.x} y2={point.outHandle.y} /><circle className="bezier-control" cx={point.outHandle.x} cy={point.outHandle.y} r="3" onPointerDown={(event) => { event.stopPropagation(); dragRef.current = { index, handle: 'outHandle' } }} /></>}</g>)
  const characterParts = layers.filter((layer) => layer.characterPart && layer.visible).map((layer) => { const bone = bones.find((item) => item.id === layer.boneId); if (!bone) return null; const start = boneWorld(bone, bones); const radians = start.rotation * Math.PI / 180; const end = { x: start.x + Math.cos(radians) * bone.length, y: start.y + Math.sin(radians) * bone.length }; const viseme = [...(layer.lipSync ?? [])].reverse().find((event) => event.frame <= currentFrame)?.viseme ?? 'Rest'; if (layer.characterPart === 'head') return <g key={layer.id} className="character-head"><circle cx={end.x} cy={end.y} r="29" fill={layer.color} /><circle cx={end.x - 10} cy={end.y - 4} r="3" fill="#263735" /><circle cx={end.x + 10} cy={end.y - 4} r="3" fill="#263735" /><path className="character-mouth" d={viseme === 'Rest' ? `M ${end.x - 7} ${end.y + 12} Q ${end.x} ${end.y + 14} ${end.x + 7} ${end.y + 12}` : `M ${end.x - (viseme === 'I' ? 4 : 8)} ${end.y + 11} Q ${end.x} ${end.y + (viseme === 'A' ? 20 : viseme === 'O' ? 24 : 16)} ${end.x + (viseme === 'I' ? 4 : 8)} ${end.y + 11}`} /></g>; if (layer.characterPart === 'torso') return <rect key={layer.id} className="character-torso" x={start.x - 24} y={start.y - 4} width="48" height={bone.length + 8} rx="14" fill={layer.color} transform={`rotate(${start.rotation + 90} ${start.x} ${start.y})`} />; return <line key={layer.id} className="character-limb" x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={layer.color} /> })
  return <svg className={`path-overlay ${activeTool === 'select' ? 'select-mode' : activeTool === 'camera' ? 'camera-mode' : 'draw-mode'}`} viewBox="0 0 800 500" onPointerDown={handleCanvasPointerDown} onPointerMove={handleMove} onPointerUp={handleUp} onPointerCancel={handleUp} onDoubleClick={finishPath}>{characterParts}{displayPath.length > 1 && <path className="path-preview" d={pathToD(displayPath)} />}{renderPoints}{bones.map((bone) => { const start = boneWorld(bone, bones); const end = { x: start.x + Math.cos(start.rotation * Math.PI / 180) * bone.length, y: start.y + Math.sin(start.rotation * Math.PI / 180) * bone.length }; return <g key={bone.id} className="bone-gizmo"><line x1={start.x} y1={start.y} x2={end.x} y2={end.y} /><circle cx={start.x} cy={start.y} r="5" /><circle cx={end.x} cy={end.y} r="4" onPointerDown={(event) => { event.stopPropagation(); boneDragRef.current = bone.id }} /><text x={start.x + 7} y={start.y - 7}>{bone.name}</text></g> })}{boneDraft && <circle className="bone-draft" cx={boneDraft.x} cy={boneDraft.y} r="5" />}</svg>
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<FabricCanvas | null>(null)
  const objectsRef = useRef<Record<string, LayerObject[]>>({})
  const objectsBySceneRef = useRef<Record<string, Record<string, LayerObject[]>>>({})
  const layers = useStudioStore((state) => state.layers)
  const currentFrame = useStudioStore((state) => state.currentFrame)
  const activeSceneId = useStudioStore((state) => state.activeSceneId)
  const activeSceneName = useStudioStore((state) => state.scenes.find((scene) => scene.id === state.activeSceneId)?.name ?? 'Scene')
  const cameraKeyframes = useStudioStore((state) => state.cameraKeyframes)
  const activeTool = useStudioStore((state) => state.activeTool)
  const assets = useStudioStore((state) => state.assets)
  const placementAssetId = useStudioStore((state) => state.placementAssetId)
  const placementCharacterPresetId = useStudioStore((state) => state.placementCharacterPresetId)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = new FabricCanvas(canvasRef.current, { width: 800, height: 500, selection: true })
    fabricCanvasRef.current = canvas
    canvas.backgroundColor = '#294440'

    const sun = new Circle({ left: 615, top: 72, radius: 57, fill: '#f5b642' })
    const farMountain = new Polygon([{ x: 0, y: 360 }, { x: 145, y: 210 }, { x: 275, y: 360 }, { x: 420, y: 185 }, { x: 590, y: 360 }, { x: 730, y: 230 }, { x: 800, y: 315 }, { x: 800, y: 500 }, { x: 0, y: 500 }], { fill: '#47636b', selectable: false, evented: false })
    const nearMountain = new Polygon([{ x: 0, y: 420 }, { x: 190, y: 275 }, { x: 360, y: 420 }, { x: 520, y: 270 }, { x: 800, y: 420 }, { x: 800, y: 500 }, { x: 0, y: 500 }], { fill: '#233938', selectable: false, evented: false })
    const title = new FabricText('OPEN ANIM', { left: 88, top: 390, fontFamily: 'DM Sans', fontSize: 28, fontWeight: '600', fill: '#f0e9d8', charSpacing: 160 })
    const subtitle = new FabricText('a study in motion', { left: 92, top: 430, fontFamily: 'DM Mono', fontSize: 11, fill: '#b1c7b8', selectable: false })
    ;(sun as LayerObject).layerId = 'sun'
    ;(farMountain as LayerObject).layerId = 'mountain'
    ;(nearMountain as LayerObject).layerId = 'mountain'
    ;(title as LayerObject).layerId = 'title'
    objectsRef.current = { sun: [sun], mountain: [farMountain, nearMountain], title: [title] }
    objectsBySceneRef.current[useStudioStore.getState().activeSceneId] = objectsRef.current
    canvas.add(farMountain, nearMountain, sun, title, subtitle)
    const selectLayerFromCanvas = (event: { selected?: FabricObject[] }) => {
      const layerId = (event.selected?.[0] as LayerObject | undefined)?.layerId
      if (layerId) useStudioStore.getState().selectLayer(layerId)
    }
    const updateLayerFromObject = (event: { target?: FabricObject }) => {
      const object = event.target as LayerObject | undefined
      if (!object?.layerId) return
      const state = useStudioStore.getState()
      const layer = state.layers.find((item) => item.id === object.layerId)
      const depth = layer ? interpolateLayerProperties(layer, state.currentFrame).depth ?? 0 : 0
      const camera = interpolateCameraKeyframe(state.cameraKeyframes, state.currentFrame)
      useStudioStore.getState().updateLayerProperties(object.layerId, { x: (object.left ?? 0) - camera.x * depth / 100, y: (object.top ?? 0) - camera.y * depth / 100, scaleX: object.scaleX, scaleY: object.scaleY, rotation: object.angle, opacity: object.opacity })
    }
    canvas.on('selection:created', selectLayerFromCanvas)
    canvas.on('selection:updated', selectLayerFromCanvas)
    canvas.on('object:modified', updateLayerFromObject)
    canvas.renderAll()
    return () => { canvas.off('selection:created', selectLayerFromCanvas); canvas.off('selection:updated', selectLayerFromCanvas); canvas.off('object:modified', updateLayerFromObject); fabricCanvasRef.current = null; void canvas.dispose() }
  }, [])

  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current
    if (!fabricCanvas) return
    Object.values(objectsRef.current).flat().forEach((object) => fabricCanvas.remove(object))
    let sceneObjects = objectsBySceneRef.current[activeSceneId]
    if (!sceneObjects) {
      sceneObjects = {}
      useStudioStore.getState().layers.forEach((layer) => {
        let object: LayerObject
        if (layer.id === 'sun') object = new Circle({ left: 615, top: 72, radius: 57, fill: layer.color }) as LayerObject
        else if (layer.id === 'mountain') object = new Polygon([{ x: 0, y: 360 }, { x: 145, y: 210 }, { x: 275, y: 360 }, { x: 420, y: 185 }, { x: 590, y: 360 }, { x: 730, y: 230 }, { x: 800, y: 315 }, { x: 800, y: 500 }, { x: 0, y: 500 }], { fill: layer.color }) as LayerObject
        else if (layer.type === 'text') object = new FabricText(layer.name, { left: 88, top: 390, fontFamily: 'DM Sans', fontSize: 24, fill: layer.color }) as LayerObject
        else object = new Rect({ left: 100, top: 100, width: 100, height: 70, fill: layer.color }) as LayerObject
        object.layerId = layer.id
        sceneObjects![layer.id] = [object]
      })
      objectsBySceneRef.current[activeSceneId] = sceneObjects
    }
    objectsRef.current = sceneObjects
    Object.values(sceneObjects).flat().forEach((object) => fabricCanvas.add(object))
    fabricCanvas.renderAll()
  }, [activeSceneId])

  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current
    if (!fabricCanvas) return
    const camera = interpolateCameraKeyframe(cameraKeyframes, currentFrame)
    const radians = camera.tilt * Math.PI / 180
    const zoom = Math.max(0.1, camera.zoom)
    const a = Math.cos(radians) * zoom
    const b = Math.sin(radians) * zoom
    const c = -Math.sin(radians) * zoom
    const d = Math.cos(radians) * zoom
    const centerX = fabricCanvas.getWidth() / 2
    const centerY = fabricCanvas.getHeight() / 2
    fabricCanvas.setViewportTransform([a, b, c, d, centerX - a * (centerX + camera.x) - c * (centerY + camera.y), centerY - b * (centerX + camera.x) - d * (centerY + camera.y)])
    layers.forEach((layer) => {
      const properties = interpolateLayerProperties(layer, currentFrame)
      if (!objectsRef.current[layer.id]) {
        const object = layer.type === 'text' ? new FabricText(layer.name, { left: 80, top: 80, fontFamily: 'DM Sans', fontSize: 24, fill: layer.color }) : new Rect({ left: 100, top: 100, width: 100, height: 70, fill: layer.color })
        ;(object as LayerObject).layerId = layer.id
        ;(object as LayerObject).baseLeft = object.left ?? 0
        ;(object as LayerObject).baseTop = object.top ?? 0
        objectsRef.current[layer.id] = [object as LayerObject]
        objectsBySceneRef.current[activeSceneId] = objectsRef.current
        fabricCanvas.add(object)
      }
      const parallax = (properties.depth ?? 0) / 100
      objectsRef.current[layer.id]?.forEach((object) => {
        object.baseLeft ??= object.left ?? 0
        object.baseTop ??= object.top ?? 0
        object.set({ visible: layer.visible, selectable: !layer.locked, left: (properties.x ?? object.baseLeft) + camera.x * parallax, top: (properties.y ?? object.baseTop) + camera.y * parallax, scaleX: properties.scaleX ?? object.scaleX, scaleY: properties.scaleY ?? object.scaleY, angle: properties.rotation ?? object.angle, opacity: properties.opacity ?? 1 })
      })
    })
    fabricCanvas.renderAll()
  }, [activeSceneId, cameraKeyframes, currentFrame, layers])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || activeTool === 'select' || activeTool === 'camera') return
    const draw = (event: { e: MouseEvent | TouchEvent }) => {
      const { x, y } = canvas.getScenePoint(event.e)
      let object: LayerObject
      const id = `${activeTool}-${Date.now()}`
      if (activeTool === 'rectangle') object = new Rect({ left: x - 50, top: y - 35, width: 100, height: 70, fill: '#ef6f51' }) as LayerObject
      else if (activeTool === 'circle') object = new Circle({ left: x - 40, top: y - 40, radius: 40, fill: '#9ed8c1' }) as LayerObject
      else object = new FabricText('New text', { left: x, top: y, fontFamily: 'DM Sans', fontSize: 24, fill: '#f0e9d8' }) as LayerObject
      object.layerId = id
      canvas.add(object)
      objectsRef.current[id] = [object]
      useStudioStore.getState().addLayer({ id, name: activeTool === 'text' ? 'New text' : `New ${activeTool}`, type: activeTool === 'text' ? 'text' : 'shape', visible: true, locked: false, color: activeTool === 'rectangle' ? '#ef6f51' : '#9ed8c1', keyframes: [{ frame: useStudioStore.getState().currentFrame, x: object.left, y: object.top, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 }] })
      useStudioStore.getState().setActiveTool('select')
      canvas.setActiveObject(object)
      canvas.renderAll()
    }
    canvas.on('mouse:down', draw)
    return () => { canvas.off('mouse:down', draw) }
  }, [activeTool])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    const asset = assets.find((item) => item.id === placementAssetId)
    if (!canvas || !asset || asset.type === 'audio') return
    let cancelled = false
    void FabricImage.fromURL(asset.url).then((image) => {
      if (cancelled) return
      const id = `asset-${asset.id}`
      image.set({ left: 280, top: 150, scaleX: 0.45, scaleY: 0.45 })
      ;(image as LayerObject).layerId = id
      objectsRef.current[id] = [image as LayerObject]
      useStudioStore.getState().addLayer({ id, name: asset.name, type: 'image', visible: true, locked: false, color: '#9ed8c1', keyframes: [{ frame: useStudioStore.getState().currentFrame, x: 280, y: 150, scaleX: 0.45, scaleY: 0.45, rotation: 0, opacity: 1 }] })
      canvas.add(image)
      canvas.setActiveObject(image)
      canvas.renderAll()
      useStudioStore.getState().requestAssetPlacement(null)
    })
    return () => { cancelled = true }
  }, [assets, placementAssetId])

  useEffect(() => {
    if (placementCharacterPresetId) useStudioStore.getState().addCharacterPreset(placementCharacterPresetId)
  }, [placementCharacterPresetId])

  const handleAssetDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const assetId = event.dataTransfer.getData('application/x-openanim-asset')
    if (assetId) useStudioStore.getState().requestAssetPlacement(assetId)
    const presetId = event.dataTransfer.getData('application/x-openanim-character')
    if (presetId) useStudioStore.getState().requestCharacterPlacement(presetId)
  }

  return <div className="canvas-frame" onDragOver={(event) => event.preventDefault()} onDrop={handleAssetDrop}><span className="canvas-label">{activeSceneName}</span><canvas ref={canvasRef} /><PathAndBoneOverlay activeTool={activeTool} currentFrame={currentFrame} /><span className="zoom-label">{Math.round(interpolateCameraKeyframe(cameraKeyframes, currentFrame).zoom * 100)}%</span></div>
}