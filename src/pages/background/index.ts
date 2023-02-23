// This is the service worker script, which executes in its own context
// when the extension is installed or refreshed (or when you access its console).
// It would correspond to the background script in chrome extensions v2.

import { createParser } from 'eventsource-parser'

// chrome.runtime.onInstalled 為 Extension 第一次被安裝時，執行事件的觸發
chrome.runtime.onInstalled.addListener(async () => {
    const url = chrome.runtime.getURL('/src/pages/popup/index.html')
    chrome.windows.create({
        url,
        type: 'popup',
        width: 400,
        height: 400,
    })
})

const readStream = (reader: ReadableStreamDefaultReader, callback: Function) => {
    reader.read().then(({ done, value }: any) => {
        if (done) {
            reader.releaseLock()
            return null
        }
        callback(value)
        return readStream(reader, callback)
    })
}
const streamAsyncIterable = (stream: ReadableStream, callback: Function) => {
    const reader = stream.getReader()
    readStream(reader, callback)
}

const postToContentScript = (payload: { port: chrome.runtime.Port, action: string, mes: string }) => {
    const { port, action, mes } = payload
    port.postMessage({
        action,
        portName: port.name,
        result: mes,
    })
}

const queryChatGPT = async (port: chrome.runtime.Port, query: string) => {
    // Replace YOUR_API_KEY with your actual API key from OpenAI
    let API_KEY = null
    try {
        const keyObj = await chrome.storage.session.get('openaiKey')
        API_KEY = structuredClone(keyObj).openaiKey
    } catch (error) {
        postToContentScript({
            port,
            action: 'ans',
            mes: error,
        })
        return error
    }
    if (!API_KEY) {
        postToContentScript({
            port,
            action: 'ans',
            mes: '[ERROR] Missing API key',
        })
        return '[ERROR] Missing API key'
    }
    // Use the fetch API to call the ChatGPT API
    const getMaxTokenNum = (_query: string): number => {
        if (_query.length < 10) return 120 // 90 words
        if (_query.length < 100) return 240 // 180 words
        if (_query.length < 1000) return 360 // 270 words
        return 480
    }
    try {
        let result = ''
        const resp = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: 'text-davinci-003',
                prompt: `Explain this: ${query}`,
                temperature: 0.5,
                max_tokens: getMaxTokenNum(query),
                stream: true,
            }),
        })
        if (!resp.ok) {
            throw new Error('[ERROR] ChatGPT failed, please check your API key or use another sentence')
        }
        const parser = createParser(event => {
            if (event.type === 'event') {
                const message = event.data
                if (message === '[DONE]') {
                    port.disconnect()
                    return
                }
                let data
                try {
                    data = JSON.parse(message)
                    const { text } = data.choices[0]
                    if (text === '<|im_end|>' || text === '<|im_sep|>') {
                        return
                    }
                    result += text
                    postToContentScript({
                        port,
                        action: 'ans',
                        mes: result,
                    })
                } catch (err) {
                    postToContentScript({
                        port,
                        action: 'ans',
                        mes: err,
                    })
                }
            }
        })
        streamAsyncIterable(resp.body!, (value: BufferSource) => {
            const str = new TextDecoder().decode(value)
            parser.feed(str)
        })
    } catch (err) {
        postToContentScript({
            port,
            action: 'ans',
            mes: err.message,
        })
        return err
    }
    return ''
}

chrome.runtime.onConnect.addListener(port => {
    if (port.name.startsWith('content-script')) {
        port.onMessage.addListener(async msg => {
            try {
                const query = msg
                queryChatGPT(port, query)
            } catch (err: any) {
                console.error(err)
                postToContentScript({
                    port,
                    action: 'ans',
                    mes: err.message,
                })
            }
        })
    }
})

chrome.contextMenus.create({
    id: 'explain-this',
    title: 'Explain This',
    contexts: ['selection'],
})
chrome.contextMenus.onClicked.addListener(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'contextMenu',
        })
    })
})
