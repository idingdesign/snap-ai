import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './history.css'

const MODES = { translate: '翻译', explain: '解释' }

function formatTime(ts) {
  const d = new Date(ts)
  const diff = Date.now() - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function HistoryPanel() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    api.storeGet('history', []).then(setItems)
  }, [])

  const filtered = items.filter(item => {
    if (filter === 'starred' && !item.starred) return false
    if (filter !== 'all' && filter !== 'starred' && item.mode !== filter) return false
    if (search && !(item.result || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleStar = async (id) => {
    const updated = items.map(i => i.id === id ? Object.assign({}, i, { starred: !i.starred }) : i)
    setItems(updated)
    window.electronAPI && window.electronAPI.storeSet('history', updated)
  }

  const deleteItem = async (id) => {
    const updated = items.filter(i => i.id !== id)
    setItems(updated)
    if (selected && selected.id === id) setSelected(null)
    window.electronAPI && window.electronAPI.storeSet('history', updated)
  }

  const clearAll = async () => {
    if (!confirm('确认清空所有历史记录？')) return
    setItems([]); setSelected(null)
    window.electronAPI && window.electronAPI.storeSet('history', [])
  }

  const handleCopy = async (text) => {
    window.electronAPI && window.electronAPI.copyText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const FILTERS = [
    { id: 'all', label: '全部' },
    { id: 'translate', label: '翻译' },
    { id: 'explain', label: '解释' },
    { id: 'starred', label: '★' },
  ]

  return (
    <div className="history-root">
      <div className="glass history-window">
        <div className="history-titlebar drag-region">
          <span className="history-title">历史记录</span>
          <div className="no-drag" style={{ display: 'flex', gap: 6 }}>
            {items.length > 0 && (
              <button className="btn-ghost" style={{ fontSize: 11 }} onClick={clearAll}>清空</button>
            )}
            <button className="icon-btn" onClick={() => window.electronAPI && window.electronAPI.closeWindow()}>x</button>
          </div>
        </div>

        <div className="history-body">
          <div className="history-sidebar">
            <div className="search-wrap">
              <input className="input search-input" placeholder="搜索..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="filter-tabs">
              {FILTERS.map(f => (
                <button key={f.id}
                  className={filter === f.id ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setFilter(f.id)}>{f.label}</button>
              ))}
            </div>
            <div className="history-list">
              {filtered.length === 0 ? (
                <div className="list-empty">
                  {search ? '没有匹配结果' : '暂无历史记录'}
                </div>
              ) : filtered.map(item => (
                <div key={item.id}
                  className={selected && selected.id === item.id ? 'history-item active' : 'history-item'}
                  onClick={() => setSelected(item)}>
                  <div className="item-header">
                    <span className="item-mode">{MODES[item.mode]}</span>
                    <span className="item-time">{formatTime(item.timestamp)}</span>
                  </div>
                  <p className="item-preview">{(item.result || '').substring(0, 80)}</p>
                  <div className="item-actions">
                    <button className={item.starred ? 'icon-btn starred' : 'icon-btn'}
                      onClick={e => { e.stopPropagation(); toggleStar(item.id) }}>
                      {item.starred ? '★' : '☆'}
                    </button>
                    <button className="icon-btn" style={{ color: 'var(--danger)' }}
                      onClick={e => { e.stopPropagation(); deleteItem(item.id) }}>x</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="history-detail">
            {selected ? (
              <div className="detail-content fade-in">
                <div className="detail-header">
                  <span className="detail-mode">{MODES[selected.mode]}</span>
                  <span className="detail-time">{formatTime(selected.timestamp)}</span>
                  <button className="btn-ghost no-drag" style={{ marginLeft: 'auto' }}
                    onClick={() => handleCopy(selected.result)}>
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <div className="detail-text">{selected.result}</div>
              </div>
            ) : (
              <div className="detail-empty">
                <p>选择左侧记录查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<HistoryPanel />)