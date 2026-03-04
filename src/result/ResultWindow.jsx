import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './result.css'

// ─── Monochrome SVG icons ─────────────────────────────────────────────────────
const IconClose = () => (
  <svg width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round'>
    <line x1='1' y1='1' x2='11' y2='11' /><line x1='11' y1='1' x2='1' y2='11' />
  </svg>
)
const IconCopy = () => (
  <svg width='14' height='14' viewBox='0 0 14 14' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
    <rect x='5' y='5' width='8' height='8' rx='1.5' />
    <path d='M9 5V2.5A1.5 1.5 0 0 0 7.5 1h-5A1.5 1.5 0 0 0 1 2.5v5A1.5 1.5 0 0 0 2.5 9H5' />
  </svg>
)
const IconStar = ({ filled }) => (
  <svg width='14' height='14' viewBox='0 0 14 14' fill={filled ? 'currentColor' : 'none'} stroke='currentColor' strokeWidth='1.4' strokeLinejoin='round'>
    <polygon points='7,1 8.8,5.2 13.5,5.6 10,8.8 11.1,13.5 7,10.8 2.9,13.5 4,8.8 0.5,5.6 5.2,5.2' />
  </svg>
)
const IconHistory = () => (
  <svg width='14' height='14' viewBox='0 0 14 14' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
    <circle cx='7' cy='7' r='5.5' />
    <polyline points='7,3.5 7,7 9.5,8.5' />
  </svg>
)

// ─── Language options ─────────────────────────────────────────────────────────
const LANGS = [
  { code: 'auto', label: '自动识别' },
  { code: '简体中文', label: '简体中文' },
  { code: '繁體中文', label: '繁體中文' },
  { code: 'English', label: 'English' },
  { code: '日本語', label: '日本語' },
  { code: '한국어', label: '한국어' },
  { code: 'Français', label: 'Français' },
  { code: 'Español', label: 'Español' },
  { code: 'Deutsch', label: 'Deutsch' },
]

// ─── Inline Markdown renderer (explain mode) ──────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null
  const blocks = text.split(/\n{2,}/)
  return blocks.map((block, bi) => {
    const t = block.trim()
    if (!t) return null
    const listLines = t.split('\n').filter(l => /^[-*]\s/.test(l.trim()))
    if (listLines.length > 0 && listLines.length === t.split('\n').filter(l => l.trim()).length) {
      return (
        <ul key={bi} className='md-list'>
          {listLines.map((line, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inlineMd(line.replace(/^[-*]\s+/, '')) }} />
          ))}
        </ul>
      )
    }
    if (/^#{1,3}\s/.test(t)) {
      const lvl = t.match(/^(#+)/)[1].length
      return <p key={bi} className={'md-h' + lvl} dangerouslySetInnerHTML={{ __html: inlineMd(t.replace(/^#+\s+/, '')) }} />
    }
    return <p key={bi} className='md-p' dangerouslySetInnerHTML={{ __html: inlineMd(t.replace(/\n/g, '<br/>')) }} />
  }).filter(Boolean)
}
function inlineMd(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

// ─── Main component ───────────────────────────────────────────────────────────
function ResultWindow() {
  const [mode, setMode] = useState('explain')
  const [targetLang, setTargetLang] = useState('auto')
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [starred, setStarred] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    api.storeGet('targetLang', 'auto').then(lang => setTargetLang(lang || 'auto'))
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

  const runAI = useCallback((m, l) => {
    setText('')
    setStreaming(true)
    setError(null)
    window.electronAPI && window.electronAPI.retriggerAI(m, l)
  }, [])

  const handleModeChange = (newMode) => {
    if (newMode === mode && !error) return
    setMode(newMode)
    runAI(newMode, targetLang)
  }

  const handleLangChange = (e) => {
    const l = e.target.value
    setTargetLang(l)
    if (mode === 'translate') runAI('translate', l)
  }

  const handleCopy = () => {
    window.electronAPI && window.electronAPI.copyText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const handleClose = () => window.electronAPI && window.electronAPI.closeResult()
  const handleHistory = () => window.electronAPI && window.electronAPI.openHistory()

  return (
    <div className='result-root fade-in'>
      <div className='glass result-window'>
        {/* ── Titlebar: mode tabs + close ── */}
        <div className='result-titlebar drag-region'>
          <div className='no-drag result-tabs'>
            <button
              className={mode === 'explain' ? 'result-tab active' : 'result-tab'}
              onClick={() => handleModeChange('explain')}>
              解释
            </button>
            <button
              className={mode === 'translate' ? 'result-tab active' : 'result-tab'}
              onClick={() => handleModeChange('translate')}>
              翻译
            </button>
            {mode === 'translate' && (
              <select className='lang-select no-drag' value={targetLang} onChange={handleLangChange}>
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            )}
          </div>
          <div className='no-drag result-actions-top'>
            <button className='icon-btn' onClick={handleHistory} title='历史'>
              <IconHistory />
            </button>
            <button className='icon-btn' onClick={handleClose} title='关闭'>
              <IconClose />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className='result-content' ref={contentRef}>
          {error ? (
            <div className='result-error'>
              <span className='error-icon'>⚠️</span>
              <p>{error}</p>
              <button className='btn-ghost' style={{ marginTop: 12 }}
                onClick={() => window.electronAPI && window.electronAPI.openSettings()}>
                打开设置
              </button>
            </div>
          ) : (
            <div className='result-text'>
              {!text && streaming && <span className='loading-dots'><span /><span /><span /></span>}
              {text && mode === 'explain' && <div className='md-body'>{renderMarkdown(text)}</div>}
              {text && mode !== 'explain' && (
                <span className={streaming ? 'cursor-blink' : ''}>{text}</span>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom toolbar ── */}
        {!error && !streaming && text && (
          <div className='result-toolbar fade-in'>
            <button className='btn-ghost btn-icon-gap' onClick={handleCopy}>
              <IconCopy /> {copied ? '已复制' : '复制'}
            </button>
            <div style={{ flex: 1 }} />
            <button
              className={starred ? 'icon-btn starred' : 'icon-btn'}
              onClick={() => setStarred(s => !s)} title='收藏'>
              <IconStar filled={starred} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<ResultWindow />)