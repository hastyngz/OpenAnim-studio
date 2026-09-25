import type { AudioTrack, Bone, CameraKeyframe, RenderPassConfig, StudioAsset, StudioLayer, StudioScene, TtsState } from '../types/studio'

interface ExportState {
  fps: number
  totalFrames: number
  layers: StudioLayer[]
  audioTracks: AudioTrack[]
  assets: StudioAsset[]
  bones: Bone[]
  cameraKeyframes: CameraKeyframe[]
  scenes: StudioScene[]
  activeSceneId: string
  renderPass: RenderPassConfig
  tts: TtsState
}

export function serializeStudioProject(state: ExportState) {
  return {
    schema: 'openanim.studio.project',
    schemaVersion: 2,
    exportTarget: 'google-colab-blender-ffmpeg',
    render: { fps: 60, sourceFps: state.fps, totalFrames: state.totalFrames, bitrate: '25M', codec: 'libx264', pixelFormat: 'yuv420p', engine: state.renderPass.engine, samples: state.renderPass.samples, motionBlur: state.renderPass.motionBlur, depthOfField: state.renderPass.depthOfField },
    activeSceneId: state.activeSceneId,
    scenes: state.scenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      totalFrames: scene.totalFrames,
      transition: scene.transition,
      layers: scene.layers.map((layer) => ({ id: layer.id, name: layer.name, type: layer.type, visible: layer.visible, locked: layer.locked, color: layer.color, boneId: layer.boneId ?? null, characterPart: layer.characterPart ?? null, lipSync: layer.lipSync ?? [], keyframes: layer.keyframes.map((keyframe) => ({ frame: keyframe.frame, easing: keyframe.easing ?? 'linear', customBezier: keyframe.customBezier ?? null, vector: { x: keyframe.x ?? 0, y: keyframe.y ?? 0, scaleX: keyframe.scaleX ?? 1, scaleY: keyframe.scaleY ?? 1, rotation: keyframe.rotation ?? 0, opacity: keyframe.opacity ?? 1 }, depth: keyframe.depth ?? 0, path: keyframe.path ?? null })) })),
      audioTracks: scene.audioTracks.map((track) => ({ id: track.id, assetId: track.assetId, name: track.name, startFrame: track.startFrame, endFrame: track.startFrame + (track.durationFrames ?? scene.totalFrames), startSeconds: track.startFrame / state.fps, durationSeconds: (track.durationFrames ?? scene.totalFrames) / state.fps, visible: track.visible, locked: track.locked, kind: track.kind ?? 'audio' })),
      bones: scene.bones.map((bone) => ({ ...bone, parentId: bone.parentId ?? null })),
      cameraKeyframes: scene.cameraKeyframes.map((keyframe) => ({ ...keyframe }))
    })),
    layers: state.layers.map((layer) => ({ id: layer.id, name: layer.name, type: layer.type, visible: layer.visible, locked: layer.locked, color: layer.color, boneId: layer.boneId ?? null, characterPart: layer.characterPart ?? null, lipSync: layer.lipSync ?? [], keyframes: layer.keyframes.map((keyframe) => ({ frame: keyframe.frame, easing: keyframe.easing ?? 'linear', customBezier: keyframe.customBezier ?? null, vector: { x: keyframe.x ?? 0, y: keyframe.y ?? 0, scaleX: keyframe.scaleX ?? 1, scaleY: keyframe.scaleY ?? 1, rotation: keyframe.rotation ?? 0, opacity: keyframe.opacity ?? 1 }, depth: keyframe.depth ?? 0, path: keyframe.path ?? null })) })),
    assets: state.assets.map((asset) => ({ id: asset.id, name: asset.name, type: asset.type, mimeType: asset.mimeType, size: asset.size, sourceFile: asset.name })),
    audioTracks: state.audioTracks.map((track) => ({ id: track.id, assetId: track.assetId, name: track.name, startFrame: track.startFrame, endFrame: track.startFrame + (track.durationFrames ?? state.totalFrames), startSeconds: track.startFrame / state.fps, durationSeconds: (track.durationFrames ?? state.totalFrames) / state.fps, visible: track.visible, locked: track.locked, kind: track.kind ?? 'audio' })),
    bones: state.bones.map((bone) => ({ ...bone, parentId: bone.parentId ?? null })),
    cameraKeyframes: state.cameraKeyframes.map((keyframe) => ({ ...keyframe })),
    renderPass: { ...state.renderPass },
    tts: { script: state.tts.script, voice: state.tts.voice, pitch: state.tts.pitch, rate: state.tts.rate, durationFrames: state.tts.durationFrames },
  }
}

export function createRenderNotebook(projectJson: string) {
  const cells = [
    { cell_type: 'markdown', metadata: { language: 'markdown' }, source: ['# OpenAnim Studio Render Pipeline', '', 'Upload `studio_project.json` and the referenced media files to Colab, then run the cells to render a 60fps high-bitrate MP4.'] },
    { cell_type: 'code', metadata: { language: 'python' }, source: ['import json, os, subprocess, pathlib, wave', 'PROJECT_PATH = "studio_project.json"', 'with open(PROJECT_PATH, "r", encoding="utf-8") as handle:', '    project = json.load(handle)', 'FPS = 60', 'OUTPUT = "openanim_render.mp4"', 'print(f"Loaded {len(project[\'layers\'])} layers, {len(project[\'bones\'])} bones, {len(project[\'scenes\'])} scenes, and {len(project[\'audioTracks\'])} audio tracks")'] },
    { cell_type: 'code', metadata: { language: 'python' }, source: ['# Install Blender/FFmpeg and Python helpers in Google Colab.', '!apt-get -qq update && apt-get -qq install -y blender ffmpeg', '!pip -q install bpy ffmpeg-python gTTS', '!mkdir -p frames'] },
    { cell_type: 'code', metadata: { language: 'python' }, source: ['# Optional cloud TTS fallback for the exported script.', 'from gtts import gTTS', 'if project["tts"]["script"]:', '    gTTS(project["tts"]["script"], lang="en", slow=False).save("tts_voiceover.mp3")'] },
    { cell_type: 'code', metadata: { language: 'python' }, source: ['# Build a Blender scene from the exported scene list, camera trajectory, and layer/keyframe data.', 'blender_script = r\'\'\'\nimport bpy, json, math\nwith open("studio_project.json", "r", encoding="utf-8") as handle:\n    project = json.load(handle)\nscene = bpy.context.scene\nscene.render.engine = project["render"]["engine"]\nscene.cycles.samples = project["render"]["samples"]\nscene.render.use_motion_blur = project["render"]["motionBlur"]\nscene.render.use_depth_of_field = project["render"]["depthOfField"]\nscene.render.resolution_x = 1920\nscene.render.resolution_y = 1080\nscene.render.resolution_percentage = 100\nscene.render.fps = 60\nscene.render.image_settings.file_format = "PNG"\nfor scene_data in project["scenes"]:\n    for layer in scene_data["layers"]:\n        empty = bpy.data.objects.new(layer["name"], None)\n        bpy.context.collection.objects.link(empty)\n        for keyframe in layer["keyframes"]:\n            vector = keyframe["vector"]\n            frame = round(keyframe["frame"] * 60 / project["render"]["sourceFps"])\n            empty.location = (vector["x"], vector["y"], layer.get("depth", 0))\n            empty.keyframe_insert(data_path="location", frame=frame)\n    if scene_data["cameraKeyframes"]:\n        camera = bpy.data.cameras.new("Camera")\n        cam_obj = bpy.data.objects.new("CameraObj", camera)\n        bpy.context.collection.objects.link(cam_obj)\n        bpy.context.scene.camera = cam_obj\n        for keyframe in scene_data["cameraKeyframes"]:\n            frame = round(keyframe["frame"] * 60 / project["render"]["sourceFps"])\n            cam_obj.location = (keyframe["x"], keyframe["y"], 2.5)\n            cam_obj.rotation_euler = (0, 0, math.radians(keyframe["tilt"]))\n            cam_obj.data.lens = 35 / keyframe["zoom"]\n            cam_obj.keyframe_insert(data_path="location", frame=frame)\n            cam_obj.keyframe_insert(data_path="rotation_euler", frame=frame)\n            cam_obj.data.keyframe_insert(data_path="lens", frame=frame)\n        scene.frame_end = max(scene.frame_end, round(scene_data["totalFrames"] * 60 / project["render"]["sourceFps"]))\nscene.frame_end = max(scene.frame_end, round(project["render"]["totalFrames"] * 60 / project["render"]["sourceFps"]))\nscene.render.filepath = "frames/frame_"\nbpy.ops.render.render(animation=True)\n\'\'\'', 'pathlib.Path("render_scene.py").write_text(blender_script, encoding="utf-8")', 'subprocess.run(["blender", "-b", "--python", "render_scene.py"], check=True)'] },
    { cell_type: 'code', metadata: { language: 'python' }, source: ['# Encode the PNG sequence and mux audio at a high bitrate.', 'audio_inputs = [asset["sourceFile"] for asset in project["assets"] if asset["type"] == "audio"]', 'command = ["ffmpeg", "-y", "-framerate", "60", "-i", "frames/frame_%04d.png"]', 'if audio_inputs:', '    command += ["-i", audio_inputs[0]]', 'command += ["-c:v", "libx264", "-b:v", project["render"]["bitrate"], "-pix_fmt", project["render"]["pixelFormat"], "-movflags", "+faststart", OUTPUT]', 'subprocess.run(command, check=True)', 'print(f"Wrote {OUTPUT}")'] },
    { cell_type: 'markdown', metadata: { language: 'markdown' }, source: ['Download `openanim_render.mp4` from the Colab file browser when rendering completes.'] },
  ]
  return { cells, metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python', version: '3' } }, nbformat: 4, nbformat_minor: 5, project: JSON.parse(projectJson) }
}