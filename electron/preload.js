const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    // Store
    storeGet: (key, def) => ipcRenderer.invoke('store-get', key, def),
    storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
    storeDelete: (key) => ipcRenderer.invoke('store-delete', key),

    // Capture
    captureRegion: (rect) => ipcRenderer.send('capture-region', rect),
    captureCancel: () => ipcRenderer.send('capture-cancel'),

    // Result window events
    onInitRequest: (cb) => ipcRenderer.on('init-request', (_, data) => cb(data)),
    onAIToken: (cb) => ipcRenderer.on('ai-token', (_, token) => cb(token)),
    onAIDone: (cb) => ipcRenderer.on('ai-done', (_, text) => cb(text)),
    onAIError: (cb) => ipcRenderer.on('ai-error', (_, err) => cb(err)),

    // Actions
    copyText: (text) => ipcRenderer.send('copy-text', text),
    closeResult: () => ipcRenderer.send('close-result'),
    openHistory: () => ipcRenderer.send('open-history'),
    openSettings: () => ipcRenderer.send('open-settings'),
    closeWindow: () => ipcRenderer.send('close-window'),
    settingsSaved: () => ipcRenderer.send('settings-saved'),
})
