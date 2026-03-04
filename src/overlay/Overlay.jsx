import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './overlay.css'

function Overlay() {
  const [dragging, setDragging] = useState(false)
  const [start, setStart] = useState({ x: 0, y: 0 })
  const [rect, setRect] = useState(null)

  const getSelRect = (s, e) => ({
    x: Math.min(s.x, e.x),
    y: Math.min(s.y, e.y),
    width: Math.abs(e.x - s.x),
    height: Math.abs(e.y - s.y),
  })

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    setDragging(true)
    setStart({ x: e.clientX, y: e.clientY })
    setRect(null)
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!dragging) return
    setRect(getSelRect(start, { x: e.clientX, y: e.clientY }))
  }, [dragging, start])

  const onMouseUp = useCallback((e) => {
    if (!dragging) return
    setDragging(false)
    const r = getSelRect(start, { x: e.clientX, y: e.clientY })
    if (r.width > 10 && r.height > 10) {
      window.electronAPI && window.electronAPI.captureRegion(r)
    }
  }, [dragging, start])

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      window.electronAPI && window.electronAPI.captureCancel()
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  return (
    <div className="overlay-root" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div className="overlay-mask" />
      {rect && rect.width > 0 && (
        <div className="selection-box" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
          <div className="selection-border" />
          <div className="corner tl" />
          <div className="corner tr" />
          <div className="corner bl" />
          <div className="corner br" />
          <div className="size-label">{Math.round(rect.width)} x {Math.round(rect.height)}</div>
        </div>
      )}
      {!dragging && !rect && (
        <div className="hint-text">
          拖拽选择区域 · 按 Esc 取消
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Overlay />)