const https = require('https')
const http = require('http')
const Store = require('./store')

// ─── Provider configs ─────────────────────────────────────────────────────────

const PROVIDERS = {
    qwen: {
        host: 'dashscope.aliyuncs.com',
        path: '/compatible-mode/v1/chat/completions',
        defaultModel: 'qwen-vl-plus',
    },
    volcengine: {
        host: 'ark.cn-beijing.volces.com',
        path: '/api/v3/chat/completions',
        defaultModel: 'doubao-seed-1-8-251228',
    },
    moonshot: {
        host: 'api.moonshot.cn',
        path: '/v1/chat/completions',
        defaultModel: 'kimi-k2.5',
    },
    custom: {
        host: null, // from store
        path: null,
        defaultModel: '',
    }
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildPrompt(mode, targetLang) {
    if (mode === 'translate') {
        const langHint = targetLang === 'auto'
            ? '若原文是中文则译为英文，若是英文或其他语言则译为简体中文。'
            : `将图中文字翻译为${targetLang}。`
        return `你是专业翻译。识别图中所有文字并翻译。${langHint}
要求：直接输出翻译结果，不加任何解释或前缀，不使用任何markdown格式（不用*、**、#、- 等符号），保留原文段落分隔。`
    }
    if (mode === 'explain') {
        return `请用简体中文解释图中内容的含义，要简洁清晰、便于阅读。
格式要求：使用markdown排版（可用**加粗**重点、适当分段，不用*、**、#、- 等符号），内容重点突出。`
    }
    return '请简洁描述图中内容。'
}


// ─── Build request body ───────────────────────────────────────────────────────

function buildRequestBody(model, imageBase64, mode, targetLang, provider) {
    const prompt = buildPrompt(mode, targetLang)

    const messages = [
        {
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:image/png;base64,${imageBase64}`,
                    }
                },
                {
                    type: 'text',
                    text: prompt,
                }
            ]
        }
    ]

    const body = {
        model,
        messages,
        stream: true,
        max_tokens: 2048,
    }

    // Moonshot: enable web search
    if (provider === 'moonshot' && mode === 'explain') {
        body.tools = [{
            type: 'builtin_function',
            function: { name: '$web_search' }
        }]
    }

    return JSON.stringify(body)
}

// ─── SSE streaming parser ─────────────────────────────────────────────────────

function parseSSEChunk(chunk) {
    const tokens = []
    const lines = chunk.toString().split('\n')

    for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content
            if (delta) tokens.push(delta)
        } catch { /* ignore parse errors */ }
    }

    return tokens
}

// ─── Main callAI function ─────────────────────────────────────────────────────

function callAI({ provider, imageBase64, mode, targetLang, onToken, onDone, onError }) {
    return new Promise((resolve, reject) => {
        const store = Store.get()
        const providerCfg = PROVIDERS[provider] || PROVIDERS.qwen

        const apiKey = store.get(`apiKeys.${provider}`, '')
        if (!apiKey) {
            const err = new Error(`请先在设置中填写 ${provider} 的 API Key`)
            onError(err)
            return reject(err)
        }

        const models = store.get('models', {})
        const model = models[provider] || providerCfg.defaultModel

        let host = providerCfg.host
        let reqPath = providerCfg.path

        // Custom provider
        if (provider === 'custom') {
            const endpoint = store.get('customEndpoint', '')
            const customModel = store.get('customModel', '')
            if (!endpoint) {
                const err = new Error('请在设置中填写自定义 API 端点')
                onError(err)
                return reject(err)
            }
            try {
                const url = new URL(endpoint.endsWith('/chat/completions') ? endpoint : endpoint + '/chat/completions')
                host = url.hostname
                reqPath = url.pathname
                if (url.port) host = `${host}:${url.port}`
            } catch {
                const err = new Error('自定义 API 端点格式无效')
                onError(err)
                return reject(err)
            }
        }

        const bodyStr = buildRequestBody(model, imageBase64, mode, targetLang, provider)

        const options = {
            hostname: host.replace(/:\d+$/, ''),
            port: host.includes(':') ? parseInt(host.split(':')[1]) : 443,
            path: reqPath,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(bodyStr),
            }
        }

        const protocol = options.port === 80 ? http : https
        let fullText = ''

        const req = protocol.request(options, (res) => {
            if (res.statusCode !== 200) {
                let errBody = ''
                res.on('data', d => { errBody += d.toString() })
                res.on('end', () => {
                    let msg = `API 错误 ${res.statusCode}`
                    try { msg += ': ' + JSON.parse(errBody)?.error?.message } catch { }
                    const err = new Error(msg)
                    onError(err)
                    reject(err)
                })
                return
            }

            res.on('data', (chunk) => {
                const tokens = parseSSEChunk(chunk)
                for (const token of tokens) {
                    fullText += token
                    onToken(token)
                }
            })

            res.on('end', () => {
                onDone(fullText)
                resolve(fullText)
            })

            res.on('error', (err) => {
                onError(err)
                reject(err)
            })
        })

        req.on('error', (err) => {
            onError(err)
            reject(err)
        })

        req.setTimeout(30000, () => {
            req.destroy()
            const err = new Error('请求超时（30s），请检查网络连接')
            onError(err)
            reject(err)
        })

        req.write(bodyStr)
        req.end()
    })
}

module.exports = { callAI }
