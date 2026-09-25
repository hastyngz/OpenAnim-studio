import { useEffect } from 'react'
import { Canvas } from './components/Canvas/Canvas'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Timeline } from './components/Timeline/Timeline'
import { Toolbar } from './components/Toolbar/Toolbar'
import { useStudioStore } from './store/useStudioStore'
import './App.css'

function App() {
  const { currentFrame, fps, isPlaying, loop, playbackSpeed, setCurrentFrame, setPlaying } = useStudioStore()

  useEffect(() => {
    if (!isPlaying) return
    const interval = window.setInterval(() => {
      const state = useStudioStore.getState()
      if (state.currentFrame >= state.totalFrames) {
        if (loop) setCurrentFrame(0)
        else setPlaying(false)
      } else setCurrentFrame(state.currentFrame + 1)
    }, 1000 / (fps * playbackSpeed))
    return () => window.clearInterval(interval)
  }, [fps, isPlaying, loop, playbackSpeed, setCurrentFrame, setPlaying])

  return (
    <main className="studio-shell">
      <Toolbar />
      <div className="workspace">
        <section className="canvas-stage" aria-label="Animation canvas"><Canvas /></section>
        <Sidebar />
      </div>
      <Timeline />
      <div className="status-bar">
        <span><i className="status-dot" /> Autosaved just now</span>
        <span>Frame {String(currentFrame).padStart(2, '0')} / 96</span>
        <button type="button" className="status-play" onClick={() => setPlaying(!isPlaying)}>{isPlaying ? 'Playing' : 'Ready'}</button>
      </div>
    </main>
  )
}

export default App
