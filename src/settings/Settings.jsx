import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './settings.css'

const PROVIDERS = [
  { id: 'qwen', name: '阿里千问', model: 'qwen-vl-plus', placeholder: 'sk-...' },
  { id: 'volcengine', name: '火山方舟', model: 'doubao-seed-1-8-251228', placeholder: 'ark-...' },
  { id: 'moonshot', name: '月之暗面 Kimi', model: 'kimi-k2.5', placeholder: 'sk-...' },
  { id: 'custom', name: '自定义', model: '', placeholder: 'API Key' },
]

const LANG_OPTIONS = [
  { value: 'auto', label: '自动检测（中↔英优先）' },
  { value: '简体中文', label: '简体中文' },
  { value: '英文', label: '英文 (English)' },
  { value: '日文', label: '日文 (日本語)' },
  { value: '韩文', label: '韩文 (한국어)' },
  { value: '法文', label: '法文 (Français)' },
  { value: '德文', label: '德文 (Deutsch)' },
]

const DEFAULT_HOTKEYS = {
  translate: 'CommandOrControl+Shift+T',
  explain: 'CommandOrControl+Shift+E',
  history: 'CommandOrControl+Shift+H',
}

function cls(...args) { return args.filter(Boolean).join(' ') }

function HotkeyInput({ value, onChange }) {
  const [recording, setRecording] = useState(false)
  const ref = React.useRef(null)

  const onKeyDown = (e) => {
    if (!recording) return
    e.preventDefault()
    const parts = []
    if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey) parts.push('Alt')
    // Normalize key name
    let key = e.key
    if (key === ' ') key = 'Space'
    else key = key.toUpperCase()
    const isModifier = ['CONTROL', 'SHIFT', 'ALT', 'META', 'COMMAND'].includes(key.toUpperCase())
    // Only save when a NON-modifier key is pressed (prevents saving on Ctrl+Shift alone)
    if (!isModifier && parts.length >= 1) {
      parts.push(key)
      onChange(parts.join('+'))
      setRecording(false)
    }
  }

  const display = value.replace('CommandOrControl', 'Ctrl').replace(/[+]/g, ' + ')

  return (
    <div ref={ref} tabIndex={0}
      className={recording ? 'hotkey-input recording' : 'hotkey-input'}
      onClick={() => { setRecording(true); ref.current && ref.current.focus() }}
      onKeyDown={onKeyDown}
      onBlur={() => setRecording(false)}
    >
      {recording ? '请按下快捷键...' : display}
    </div>
  )
}

function Settings() {
  const [activeTab, setActiveTab] = useState('api')
  const [provider, setProvider] = useState('qwen')
  const [apiKeys, setApiKeys] = useState({})
  const [models, setModels] = useState({})
  const [customEndpoint, setCustomEndpoint] = useState('')
  const [hotkeys, setHotkeys] = useState(DEFAULT_HOTKEYS)
  const [targetLang, setTargetLang] = useState('auto')
  const [autoClose, setAutoClose] = useState(true)
  const [autoCloseDelay, setAutoCloseDelay] = useState(8)
  const [autoStart, setAutoStart] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    Promise.all([
      api.storeGet('provider', 'qwen'),
      api.storeGet('apiKeys', {}),
      api.storeGet('models', {}),
      api.storeGet('customEndpoint', ''),
      api.storeGet('hotkeys', DEFAULT_HOTKEYS),
      api.storeGet('targetLang', 'auto'),
      api.storeGet('autoClose', true),
      api.storeGet('autoCloseDelay', 8),
      api.getAutoStart(),
    ]).then(([prov, keys, mods, ep, hk, lang, ac, acd, as_]) => {
      setProvider(prov)
      setApiKeys(keys)
      var merged = {}
      PROVIDERS.forEach(function(p) { merged[p.id] = (mods && mods[p.id]) || p.model })
      setModels(merged)
      setCustomEndpoint(ep || '')
      setHotkeys(Object.assign({}, DEFAULT_HOTKEYS, hk))
      setTargetLang(lang || 'auto')
      setAutoClose(ac !== false)
      setAutoCloseDelay(acd || 8)
      setAutoStart(!!as_)
    }).catch(function(e) { console.error('store error', e) })
  }, [])

  const handleSave = async () => {
    const api = window.electronAPI
    if (!api) return
    await Promise.all([
      api.storeSet('provider', provider),
      api.storeSet('apiKeys', apiKeys),
      api.storeSet('models', models),
      api.storeSet('customEndpoint', customEndpoint),
      api.storeSet('hotkeys', hotkeys),
      api.storeSet('targetLang', targetLang),
      api.storeSet('autoClose', autoClose),
      api.storeSet('autoCloseDelay', autoCloseDelay),
      api.setAutoStart(autoStart),
    ])
    api.settingsSaved()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const TABS = [
    { id: 'api', label: 'AI 服务' },
    { id: 'hotkeys', label: '快捷键' },
    { id: 'general', label: '通用' },
  ]

  return (
    <div className="settings-root">
      <div className="glass settings-window">

        <div className="settings-titlebar drag-region">
          <span className="settings-title">SnapAI 设置</span>
          <button className="no-drag icon-btn" onClick={() => window.electronAPI && window.electronAPI.closeWindow()}>X</button>
        </div>

        <div className="settings-tabs no-drag">
          {TABS.map(tab => (
            <button key={tab.id}
              className={activeTab === tab.id ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab(tab.id)}
            >{tab.label}</button>
          ))}
        </div>

        <div className="settings-content">

          {activeTab === 'api' && (
            <div className="tab-panel">
              <div className="form-group">
                <label className="label">当前使用的 AI 服务</label>
                <select className="select" value={provider} onChange={e => setProvider(e.target.value)}>
                  {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="sub-label" style={{ marginTop: 6 }}>
                  下阭切换要使用的服务，各服务密阔独立保存，随时可切换。
                </div>
              </div>
              <div className="divider" />
              {PROVIDERS.map(p => (
                <div key={p.id} className={provider === p.id ? 'provider-section active' : 'provider-section'}>
                  <div className="provider-header">
                    <span className="provider-name">{p.name}</span>
                    {provider === p.id && <span className="badge-active">使用中</span>}
                  </div>
                  <div className="form-group">
                    <label className="label">API Key</label>
                    <input type="password" className="input" placeholder={p.placeholder}
                      value={apiKeys[p.id] || ''}
                      onChange={e => setApiKeys(prev => Object.assign({}, prev, { [p.id]: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">模型</label>
                    <input type="text" className="input"
                      value={(models && models[p.id]) || p.model}
                      onChange={e => setModels(prev => Object.assign({}, prev, { [p.id]: e.target.value }))} />
                  </div>
                  {p.id === 'custom' && (
                    <div className="form-group">
                      <label className="label">Base URL</label>
                      <input type="text" className="input" placeholder="http://localhost:11434/v1"
                        value={customEndpoint}
                        onChange={e => setCustomEndpoint(e.target.value)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'hotkeys' && (
            <div className="tab-panel">
              <p className="hint-p">点击快捷键区域，然后按下新组合键。</p>
              {[
                { key: 'translate', label: '截图 → 翻译' },
                { key: 'explain', label: '截图 → 解释' },
                { key: 'history', label: '历史记录' },
              ].map(function(item) { return (
                <div key={item.key} className="form-group hotkey-row">
                  <label className="label">{item.label}</label>
                  <HotkeyInput value={hotkeys[item.key] || DEFAULT_HOTKEYS[item.key]}
                    onChange={val => setHotkeys(prev => Object.assign({}, prev, { [item.key]: val }))} />
                </div>
              )})}
            </div>
          )}

          {activeTab === 'general' && (
            <div className="tab-panel">
              <div className="form-group">
                <label className="label">翻译目标语言</label>
                <select className="select" value={targetLang} onChange={e => setTargetLang(e.target.value)}>
                  {LANG_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div className="divider" />
              <div className="form-group">
                <div className="toggle-row">
                  <div>
                    <div className="label">开机自动启动</div>
                    <div className="sub-label">登录系统后自动在后台启动</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={autoStart} onChange={e => setAutoStart(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
              <div className="divider" />
              <div className="form-group">
                <div className="toggle-row">
                  <div>
                    <div className="label">自动关闭结果窗口</div>
                    <div className="sub-label">无操作时自动关闭</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={autoClose} onChange={e => setAutoClose(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
              {autoClose && (
                <div className="form-group">
                  <label className="label">延迟（秒）</label>
                  <input type="number" className="input" min={3} max={60}
                    value={autoCloseDelay}
                    onChange={e => setAutoCloseDelay(Number(e.target.value))}
                    style={{ width: 100 }} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="settings-footer">
          <span className="version-text">SnapAI v1.0.0</span>
          <button className="btn-primary" onClick={handleSave}>
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>

      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Settings />)