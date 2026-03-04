const { Tray, Menu, nativeImage, app } = require('electron')
const path = require('path')

let tray = null

function createTray({ createSettingsWindow, createHistoryWindow }) {
    // Use a simple icon (fallback to empty if not found)
    let icon
    try {
        icon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-icon.png'))
        if (icon.isEmpty()) throw new Error('empty')
        icon = icon.resize({ width: 16, height: 16 })
    } catch {
        // Create a minimal 16×16 placeholder icon programmatically
        icon = nativeImage.createEmpty()
    }

    tray = new Tray(icon)
    tray.setToolTip('SnapAI — 截图翻译 & AI 查询')

    const buildMenu = () => Menu.buildFromTemplate([
        { label: 'SnapAI', enabled: false },
        { type: 'separator' },
        {
            label: '📋 历史记录',
            accelerator: 'CmdOrCtrl+Shift+H',
            click: () => createHistoryWindow()
        },
        {
            label: '⚙️  设置',
            click: () => createSettingsWindow()
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => app.exit(0)
        }
    ])

    tray.setContextMenu(buildMenu())

    // Double-click opens settings
    tray.on('double-click', () => createSettingsWindow())
}

module.exports = { createTray }
