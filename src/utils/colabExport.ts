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
  let sceneCursor = 0
  const scenes = state.scenes.map((scene) => {
    const startFrame = sceneCursor
    const renderDurationFrames = Math.round(scene.totalFrames * 60 / state.fps)
    sceneCursor += renderDurationFrames
    return {
      id: scene.id,
      name: scene.name,
      startFrame,
      endFrame: sceneCursor - 1,
      startSeconds: startFrame / 60,
      totalFrames: scene.totalFrames,
      renderDurationFrames,
      transition: scene.transition,
      layers: scene.layers.map((layer) => ({ id: layer.id, name: layer.name, type: layer.type, visible: layer.visible, locked: layer.locked, color: layer.color, depth: layer.depth ?? 0, boneId: layer.boneId ?? null, characterPart: layer.characterPart ?? null, lipSync: layer.lipSync ?? [], keyframes: layer.keyframes.map((keyframe) => ({ frame: keyframe.frame, easing: keyframe.easing ?? 'linear', customBezier: keyframe.customBezier ?? null, vector: { x: keyframe.x ?? 0, y: keyframe.y ?? 0, scaleX: keyframe.scaleX ?? 1, scaleY: keyframe.scaleY ?? 1, rotation: keyframe.rotation ?? 0, opacity: keyframe.opacity ?? 1 }, depth: keyframe.depth ?? layer.depth ?? 0, path: keyframe.path ?? null })) })),
      audioTracks: scene.audioTracks.map((track) => ({ id: track.id, assetId: track.assetId, name: track.name, startFrame: track.startFrame, absoluteStartFrame: startFrame + Math.round(track.startFrame * 60 / state.fps), endFrame: track.startFrame + (track.durationFrames ?? scene.totalFrames), startSeconds: track.startFrame / state.fps, absoluteStartSeconds: startFrame / 60 + track.startFrame / state.fps, durationSeconds: (track.durationFrames ?? scene.totalFrames) / state.fps, visible: track.visible, locked: track.locked, kind: track.kind ?? 'audio' })),
      bones: scene.bones.map((bone) => ({ ...bone, parentId: bone.parentId ?? null })),
      cameraKeyframes: scene.cameraKeyframes.map((keyframe) => ({ ...keyframe, renderFrame: startFrame + Math.round(keyframe.frame * 60 / state.fps) })),
    }
  })
  return {
    schema: 'openanim.studio.project',
    schemaVersion: 3,
    exportTarget: 'google-colab-blender-ffmpeg',
    render: { fps: 60, sourceFps: state.fps, totalFrames: sceneCursor || state.totalFrames, qualityPreset: state.renderPass.qualityPreset, resolutionWidth: state.renderPass.resolutionWidth, resolutionHeight: state.renderPass.resolutionHeight, transparent: state.renderPass.transparent, bitrate: state.renderPass.bitrate, codec: state.renderPass.codec, pixelFormat: state.renderPass.pixelFormat, engine: state.renderPass.engine, samples: state.renderPass.samples, motionBlur: state.renderPass.motionBlur, depthOfField: state.renderPass.depthOfField },
    activeSceneId: state.activeSceneId,
    scenes,
    layers: state.layers.map((layer) => ({ id: layer.id, name: layer.name, type: layer.type, visible: layer.visible, locked: layer.locked, color: layer.color, depth: layer.depth ?? 0, boneId: layer.boneId ?? null, characterPart: layer.characterPart ?? null, lipSync: layer.lipSync ?? [], keyframes: layer.keyframes.map((keyframe) => ({ frame: keyframe.frame, easing: keyframe.easing ?? 'linear', customBezier: keyframe.customBezier ?? null, vector: { x: keyframe.x ?? 0, y: keyframe.y ?? 0, scaleX: keyframe.scaleX ?? 1, scaleY: keyframe.scaleY ?? 1, rotation: keyframe.rotation ?? 0, opacity: keyframe.opacity ?? 1 }, depth: keyframe.depth ?? layer.depth ?? 0, path: keyframe.path ?? null })) })),
    assets: state.assets.map((asset) => ({ id: asset.id, name: asset.name, type: asset.type, mimeType: asset.mimeType, size: asset.size, sourceFile: asset.name })),
    audioTracks: state.audioTracks.map((track) => ({ id: track.id, assetId: track.assetId, name: track.name, startFrame: track.startFrame, endFrame: track.startFrame + (track.durationFrames ?? state.totalFrames), startSeconds: track.startFrame / state.fps, durationSeconds: (track.durationFrames ?? state.totalFrames) / state.fps, visible: track.visible, locked: track.locked, kind: track.kind ?? 'audio' })),
    bones: state.bones.map((bone) => ({ ...bone, parentId: bone.parentId ?? null })),
    cameraKeyframes: state.cameraKeyframes.map((keyframe) => ({ ...keyframe })),
    renderPass: { ...state.renderPass },
    tts: { script: state.tts.script, voice: state.tts.voice, pitch: state.tts.pitch, rate: state.tts.rate, durationFrames: state.tts.durationFrames },
  }
}

function createLegacyRenderNotebook(projectJson: string) {
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

  export function createRenderNotebook(projectJson: string) {
    const notebook = createLegacyRenderNotebook(projectJson)
    const blenderScript = String.raw`import bpy, json, math
  with open("studio_project.json", "r", encoding="utf-8") as handle:
    project = json.load(handle)
  scene = bpy.context.scene
  render = project["render"]
  scene.render.engine = render["engine"]
  scene.render.resolution_x = render["resolutionWidth"]
  scene.render.resolution_y = render["resolutionHeight"]
  scene.render.resolution_percentage = 100
  scene.render.fps = render["fps"]
  scene.render.image_settings.file_format = "PNG"
  scene.render.image_settings.color_mode = "RGBA" if render["transparent"] else "RGB"
  scene.render.film_transparent = render["transparent"]
  scene.render.filepath = "frames/frame_"
  scene.render.use_motion_blur = render["motionBlur"]
  scene.frame_start = 1
  scene.frame_end = render["totalFrames"]
  if render["engine"] == "CYCLES":
    scene.cycles.samples = render["samples"]
  elif hasattr(scene, "eevee"):
    scene.eevee.taa_render_samples = render["samples"]
  camera_data = bpy.data.cameras.new("OpenAnim Camera")
  camera = bpy.data.objects.new("OpenAnim Camera", camera_data)
  scene.collection.objects.link(camera)
  scene.camera = camera
  camera_data.lens = 35
  camera_data.dof.use_dof = render["depthOfField"]
  camera_data.dof.focus_distance = 10
  camera_data.dof.aperture_fstop = 2.8
  def material_for(hex_color):
    color = hex_color.lstrip("#")
    rgb = tuple(int(color[index:index + 2], 16) / 255 for index in (0, 2, 4))
    material = bpy.data.materials.new("OpenAnim " + hex_color)
    material.diffuse_color = (*rgb, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    if hasattr(material, "surface_render_method"):
      material.surface_render_method = "DITHERED"
    return material
  def key_alpha(material, frame, value):
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Alpha"].default_value = value
    shader.inputs["Alpha"].keyframe_insert(data_path="default_value", frame=frame)
  def add_layer_object(shot, layer, layer_index):
    material = material_for(layer["color"])
    if layer["type"] == "text":
      data = bpy.data.curves.new(layer["name"], "FONT")
      data.body = layer["name"]
      data.size = 0.5
      obj = bpy.data.objects.new(layer["name"], data)
    else:
      mesh = bpy.data.meshes.new(layer["name"])
      mesh.from_pydata([(-0.5, -0.5, 0), (0.5, -0.5, 0), (0.5, 0.5, 0), (-0.5, 0.5, 0)], [], [(0, 1, 2, 3)])
      obj = bpy.data.objects.new(layer["name"], mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(material)
    transition_frames = min(12, max(1, shot["renderDurationFrames"] // 4))
    start = shot["startFrame"] + 1
    end = shot["endFrame"] + 1
    key_alpha(material, 1, 0)
    if start > 1:
      key_alpha(material, start - 1, 0)
    if shot["startFrame"] > 0 and project["scenes"][shot["index"] - 1]["transition"] != "cut":
      stagger = layer_index % 5 if shot["transition"] == "dissolve" else 0
      key_alpha(material, start + stagger, 0)
      key_alpha(material, min(end, start + transition_frames + stagger), 1)
    else:
      key_alpha(material, start, 1)
    if shot["transition"] != "cut":
      stagger = layer_index % 5 if shot["transition"] == "dissolve" else 0
      key_alpha(material, max(start, end - transition_frames + stagger), 1)
      key_alpha(material, end, 0)
    else:
      key_alpha(material, end, 1)
    key_alpha(material, end + 1, 0)
    for keyframe in layer["keyframes"]:
      vector = keyframe["vector"]
      frame = start + round(keyframe["frame"] * render["fps"] / render["sourceFps"])
      obj.location = ((vector["x"] - 400) / 100, (250 - vector["y"]) / 100, -keyframe["depth"] / 100)
      obj.scale = (max(0.01, vector["scaleX"]), max(0.01, vector["scaleY"]), 1)
      obj.rotation_euler[2] = math.radians(vector["rotation"])
      obj.keyframe_insert(data_path="location", frame=frame)
      obj.keyframe_insert(data_path="scale", frame=frame)
      obj.keyframe_insert(data_path="rotation_euler", frame=frame)
  for index, shot_data in enumerate(project["scenes"]):
    shot = dict(shot_data)
    shot["index"] = index
    shot["startFrame"] = shot_data["startFrame"]
    shot["endFrame"] = shot_data["endFrame"]
    shot["transition"] = shot_data["transition"]
    for layer_index, layer in enumerate(shot["layers"]):
      if layer["visible"]:
        add_layer_object(shot, layer, layer_index)
    for keyframe in shot["cameraKeyframes"]:
      frame = shot["startFrame"] + 1 + round(keyframe["frame"] * render["fps"] / render["sourceFps"])
      camera.location = (keyframe["x"] / 100, -keyframe["y"] / 100, 10)
      camera.rotation_euler = (0, 0, math.radians(keyframe["tilt"]))
      camera_data.lens = 35 * keyframe["zoom"]
      camera.keyframe_insert(data_path="location", frame=frame)
      camera.keyframe_insert(data_path="rotation_euler", frame=frame)
      camera_data.keyframe_insert(data_path="lens", frame=frame)
  bpy.ops.render.render(animation=True)
  `
    notebook.cells[4] = { cell_type: 'code', metadata: { language: 'python' }, source: [`blender_script = ${JSON.stringify(blenderScript)}`, 'with open("render.py", "w", encoding="utf-8") as handle:', '    handle.write(blender_script)', 'subprocess.run(["blender", "--background", "--python", "render.py"], check=True)'] }
    notebook.cells[5] = { cell_type: 'code', metadata: { language: 'python' }, source: [
    '# Encode scene-local audio cues at their serialized shot offsets.',
    'asset_files = {asset["id"]: asset["sourceFile"] for asset in project["assets"]}',
    'audio_cues = [(asset_files[cue["assetId"]], cue["absoluteStartSeconds"]) for shot in project["scenes"] for cue in shot["audioTracks"] if cue["visible"] and cue["assetId"] in asset_files]',
    'command = ["ffmpeg", "-y", "-framerate", str(project["render"]["fps"]), "-i", "frames/frame_%04d.png"]',
    'for filename, offset in audio_cues:',
    '    command += ["-itsoffset", str(offset), "-i", filename]',
    'if audio_cues:',
    '    streams = "".join(f"[{index}:a]" for index in range(1, len(audio_cues) + 1))',
    '    command += ["-filter_complex", f"{streams}amix=inputs={len(audio_cues)}:duration=longest:dropout_transition=0[audio]", "-map", "0:v:0", "-map", "[audio]"]',
    'else:',
    '    command += ["-map", "0:v:0"]',
    'render = project["render"]',
    'output = "openanim_render.webm" if render["qualityPreset"] == "transparent-webm" else "openanim_render.mp4"',
    'command += ["-c:v", render["codec"], "-b:v", render["bitrate"], "-pix_fmt", render["pixelFormat"]]',
    'if render["qualityPreset"] == "transparent-webm":',
    '    command += ["-auto-alt-ref", "0", "-c:a", "libopus"]',
    'else:',
    '    command += ["-c:a", "aac", "-movflags", "+faststart"]',
    'command += ["-shortest", output]',
    'subprocess.run(command, check=True)',
    'print(f"Wrote {output}")',
    ] }
    return notebook
  }