import React, { useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './result.css'

const MODES = { translate: '翻译', explain: '解释' }

// Simple markdown renderer for explain mode
function renderMarkdown(text) {
  if (!text) return null
  // Split into blocks by double newline
  const blocks = text.split(/\n{2,}/)
  return blocks.map((block, bi) => {
    const trimmed = block.trim()
    if (!trimmed) return null
    // Check if this block is a list (lines starting with - or *)
    const listLines = trimmed.split('\n').filter(l => /^[-*]\s/.test(l.trim()))
    if (listLines.length > 0 && listLines.length === trimmed.split('\n').filter(l => l.trim()).length) {
      return (
        <ul key={bi} className="md-list">
          {listLines.map((line, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inlineMarkdown(line.replace(/^[-*]\s+/, '')) }} />
          ))}
        </ul>
      )
    }
    // Heading
    if (/^#{1,3}\s/.test(trimmed)) {
      const level = trimmed.match(/^(#+)/)[1].length
      const headText = trimmed.replace(/^#+\s+/, '')
      return <p key={bi} className={'md-h' + level} dangerouslySetInnerHTML={{ __html: inlineMarkdown(headText) }} />
    }
    // Regular paragraph
    return <p key={bi} className="md-p" dangerouslySetInnerHTML={{ __html: inlineMarkdown(trimmed.replace(/\n/g, '<br/>')) }} />
  }).filter(Boolean)
}

function inlineMarkdown(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function ResultWindow() {
  const [mode, setMode] = useState('translate')
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [starred, setStarred] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    api.onInitRequest((data) => {
      setMode(data.mode || 'translate')
      setText('')
      setStreaming(true)
      setError(null)
    })
    api.onAIToken((token) => { setText(prev => prev + token) })
    api.onAIDone(() => { setStreaming(false) })
    api.onAIError((err) => { setError(err); setStreaming(false) })
  }, [])

  useEffect(() => {
    if (streaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [text, streaming])

  const handleCopy = () => {
    window.electronAPI && window.electronAPI.copyText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleClose = () => window.electronAPI && window.electronAPI.closeResult()
  const handleHistory = () => window.electronAPI && window.electronAPI.openHistory()

  return (
    <div className="result-root fade-in">
      <div className="glass result-window">
        <div className="result-titlebar drag-region">
          <div className="no-drag result-mode-badge">
            {mode === 'translate' ? '🌐' : '💡'} {MODES[mode] || mode}
          </div>
          <div className="no-drag result-actions-top">
            <button className="icon-btn" onClick={handleHistory} title="历史">⏱</button>
            <button className="icon-btn" onClick={handleClose} title="关闭">x</button>
          </div>
        </div>

        <div className="result-content" ref={contentRef}>
          {error ? (
            <div className="result-error">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
              <button className="btn-ghost" style={{ marginTop: 12 }}
                onClick={() => window.electronAPI && window.electronAPI.openSettings()}>
                打开设置
              </button>
            </div>
          ) : (
            <div className="result-text">
              {!text && streaming && <span className="loading-dots"><span /><span /><span /></span>}
              {text && mode === 'explain' && <div className="md-body">{renderMarkdown(text)}</div>}
              {text && mode !== 'explain' && (
                <span className={streaming ? 'cursor-blink' : ''}>{text}</span>
              )}
            </div>
          )}
        </div>

        {!error && !streaming && text && (
          <div className="result-toolbar fade-in">
            <button className="btn-ghost" onClick={handleCopy}>
              {copied ? '已复制' : '复制'}
            </button>
            <div style={{ flex: 1 }} />
            <button className={starred ? 'icon-btn starred' : 'icon-btn'}
              onClick={() => setStarred(s => !s)} title="收藏">
              {starred ? '★' : '☆'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<ResultWindow />)