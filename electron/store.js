const Store = require('electron-store')

let _store = null

function get() {
    if (!_store) {
        _store = new Store({
            name: 'snap-ai-config',
            defaults: {
                provider: 'qwen',
                apiKeys: {
                    qwen: '',
                    volcengine: '',
                    moonshot: '',
                    custom: '',
                },
                customEndpoint: '',
                customModel: '',
                models: {
                    qwen: 'qwen-vl-plus',
                    volcengine: 'doubao-seed-1-8-251228',
                    moonshot: 'kimi-k2.5',
                },
                hotkeys: {
                    translate: 'CommandOrControl+Shift+T',
                    explain: 'CommandOrControl+Shift+E',
                    history: 'CommandOrControl+Shift+H',
                },
                targetLang: 'auto',
                autoClose: true,
                autoCloseDelay: 8,
                theme: 'dark',
                history: [],
            }
        })
    }
    return _store
}

module.exports = { get }
