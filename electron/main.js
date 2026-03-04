const { app, BrowserWindow, globalShortcut, ipcMain, screen, nativeImage, clipboard } = require('electron')
const path = require('path')
const Store = require('./store')
const { createTray } = require('./tray')
const { captureRegion } = require('./screenshot')
const { callAI } = require('./ai')

// Use app.isPackaged — reliable cross-platform dev/prod detection
// isDev = true when running via `electron .` or `npx electron .`
// isDev = false when running from a packaged installer
let isDev = true // default to dev; will be updated after app ready


let overlayWin = null
let resultWin = null
let historyWin = null
let settingsWin = null
let currentImage = null  // Stored for mode/lang switching in result window

// ─── Window helpers ───────────────────────────────────────────────────────────

function getRendererURL(page) {
    if (isDev) {
        return `http://localhost:5173/src/${page}/index.html`
    }
    return `file://${path.join(__dirname, `../dist/${page}/index.html`)}`
}

function createOverlayWindow() {
    const { width, height } = screen.getPrimaryDisplay().bounds

    overlayWin = new BrowserWindow({
        x: 0, y: 0,
        width, height,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: true,
        resizable: false,
        movable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    })

    overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    overlayWin.loadURL(isDev
        ? 'http://localhost:5173/src/overlay/index.html'
        : `file://${path.join(__dirname, '../dist/src/overlay/index.html')}`
    )
    overlayWin.once('ready-to-show', () => {
        overlayWin.show()
        overlayWin.focus()
    })
}

function createResultWindow(x, y) {
    if (resultWin && !resultWin.isDestroyed()) {
        resultWin.close()
    }

    const { workAreaSize } = screen.getPrimaryDisplay()
    const winW = 420
    const winH = 500

    // Position: prefer right side, avoid overflow
    let posX = Math.min(x + 20, workAreaSize.width - winW - 20)
    let posY = Math.min(y, workAreaSize.height - winH - 20)

    resultWin = new BrowserWindow({
        x: posX, y: posY,
        width: winW,
        height: winH,
        minWidth: 320,
        minHeight: 200,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true,
        show: false,  // Don't show until content is ready
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    })

    resultWin.loadURL(isDev
        ? 'http://localhost:5173/src/result/index.html'
        : `file://${path.join(__dirname, '../dist/src/result/index.html')}`
    )
    // Don't call show() here — window will be shown from capture-region handler
    // after did-finish-load so React is fully mounted before first paint
}

function createHistoryWindow() {
    if (historyWin && !historyWin.isDestroyed()) {
        historyWin.focus()
        return
    }

    historyWin = new BrowserWindow({
        width: 720, height: 600,
        minWidth: 500, minHeight: 400,
        frame: false,
        backgroundColor: '#0e1015',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    })

    historyWin.loadURL(isDev
        ? 'http://localhost:5173/src/history/index.html'
        : `file://${path.join(__dirname, '../dist/src/history/index.html')}`
    )
    historyWin.once('closed', () => { historyWin = null })
    historyWin.once('ready-to-show', () => historyWin.show())
}

function createSettingsWindow() {
    if (settingsWin && !settingsWin.isDestroyed()) {
        settingsWin.focus()
        return
    }

    settingsWin = new BrowserWindow({
        width: 640, height: 560,
        minWidth: 520, minHeight: 480,
        frame: false,
        backgroundColor: '#0e1015',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    })

    settingsWin.loadURL(isDev
        ? 'http://localhost:5173/src/settings/index.html'
        : `file://${path.join(__dirname, '../dist/src/settings/index.html')}`
    )
    settingsWin.once('closed', () => { settingsWin = null })
    settingsWin.once('ready-to-show', () => settingsWin.show())
}

// ─── Global Shortcut Registration ────────────────────────────────────────────

function registerShortcuts() {
    globalShortcut.unregisterAll()

    const store = Store.get()
    const DEFAULTS = {
        snap: 'CommandOrControl+Shift+S',
        history: 'CommandOrControl+Shift+H',
    }
    const hotkeys = store.get('hotkeys', DEFAULTS)

    // Validate: a hotkey must end with a non-modifier key (not just modifiers+nothing)
    function isValid(hk) {
        if (!hk || typeof hk !== 'string') return false
        const last = hk.split('+').pop().trim()
        return last.length > 0 && !['', 'Control', 'Shift', 'Alt', 'Meta', 'Command', 'CommandOrControl'].includes(last)
    }

    const toRegister = [
        { key: isValid(hotkeys.snap) ? hotkeys.snap : DEFAULTS.snap, fn: () => triggerCapture() },
        { key: isValid(hotkeys.history) ? hotkeys.history : DEFAULTS.history, fn: () => createHistoryWindow() },
    ]

    for (const { key, fn } of toRegister) {
        try {
            globalShortcut.register(key, fn)
        } catch (e) {
            console.error('Shortcut registration failed for', key, ':', e.message)
        }
    }
}


function triggerCapture() {
    if (overlayWin && !overlayWin.isDestroyed()) {
        overlayWin.close()
        overlayWin = null
    }
    createOverlayWindow()
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

function setupIPC() {
    // Overlay: user selected a region
    ipcMain.on('capture-region', async (event, rect) => {
        if (overlayWin && !overlayWin.isDestroyed()) {
            overlayWin.hide()
        }

        try {
            const imgBase64 = await captureRegion(rect)

            // Open result window near selection
            const absX = rect.x + rect.width
            const absY = rect.y
            createResultWindow(absX, absY)

            // Wait for renderer React to mount, then show window + init
            resultWin.webContents.once('did-finish-load', () => {
                resultWin.show()  // Show only now — React is mounted, loading dots visible
                resultWin.webContents.send('init-request', {
                    mode: 'explain',  // Default; user can switch to translate via tabs
                })
                currentImage = imgBase64  // Store for re-triggering on mode/lang switch
                startAIStream(imgBase64, 'explain')
            })
        } catch (err) {
            console.error('Capture failed:', err)
        } finally {
            if (overlayWin && !overlayWin.isDestroyed()) {
                overlayWin.close()
                overlayWin = null
            }
        }
    })

    // Overlay: cancelled
    ipcMain.on('capture-cancel', () => {
        if (overlayWin && !overlayWin.isDestroyed()) {
            overlayWin.close()
            overlayWin = null
        }
    })

    // Result: copy text
    ipcMain.on('copy-text', (event, text) => {
        clipboard.writeText(text)
    })

    // Result: close self
    ipcMain.on('close-result', () => {
        if (resultWin && !resultWin.isDestroyed()) resultWin.close()
    })

    // Result: open history
    ipcMain.on('open-history', () => createHistoryWindow())

    // Settings: save + re-register shortcuts
    ipcMain.on('settings-saved', () => {
        registerShortcuts()
    })

    // Auto-start on login (Windows registry / macOS LaunchAgents)
    ipcMain.handle('set-auto-start', (_, enabled) => {
        app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true })
    })
    ipcMain.handle('get-auto-start', () => {
        return app.getLoginItemSettings().openAtLogin
    })

    // Retrigger AI with new mode/lang (from result window mode tabs)
    ipcMain.on('retrigger-ai', (event, { mode, targetLang }) => {
        if (!currentImage) return
        startAIStream(currentImage, mode, targetLang || null)
    })

    ipcMain.on('open-settings', () => createSettingsWindow())
    ipcMain.on('close-window', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win) win.close()
    })

    // Store bridge
    ipcMain.handle('store-get', (event, key, def) => Store.get().get(key, def))
    ipcMain.handle('store-set', (event, key, value) => Store.get().set(key, value))
    ipcMain.handle('store-delete', (event, key) => Store.get().delete(key))
}

async function startAIStream(imageBase64, mode, targetLangOverride = null) {
    const store = Store.get()
    const provider = store.get('provider', 'qwen')
    const targetLang = targetLangOverride || store.get('targetLang', 'auto')

    try {
        await callAI({
            provider,
            imageBase64,
            mode,
            targetLang,
            onToken: (token) => {
                if (resultWin && !resultWin.isDestroyed()) {
                    resultWin.webContents.send('ai-token', token)
                }
            },
            onDone: (fullText) => {
                if (resultWin && !resultWin.isDestroyed()) {
                    resultWin.webContents.send('ai-done', fullText)
                }
                // Save to history
                const history = store.get('history', [])
                history.unshift({
                    id: Date.now().toString(),
                    mode,
                    result: fullText,
                    timestamp: Date.now(),
                    starred: false,
                })
                store.set('history', history.slice(0, 200)) // keep last 200
            },
            onError: (err) => {
                if (resultWin && !resultWin.isDestroyed()) {
                    resultWin.webContents.send('ai-error', err.message || String(err))
                }
            }
        })
    } catch (err) {
        if (resultWin && !resultWin.isDestroyed()) {
            resultWin.webContents.send('ai-error', err.message || String(err))
        }
    }
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
    app.setName('SnapAI')

    // Set isDev based on packaging state (works regardless of NODE_ENV)
    isDev = !app.isPackaged
    console.log(`[SnapAI] isDev=${isDev}, isPackaged=${app.isPackaged}`)

    // macOS: don't show in dock
    if (process.platform === 'darwin') {
        app.dock.hide()
    }

    setupIPC()
    createTray({ createSettingsWindow, createHistoryWindow })
    registerShortcuts()
})

app.on('window-all-closed', (e) => {
    // Keep app alive — it lives in the tray
    e.preventDefault()
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

module.exports = { registerShortcuts }
