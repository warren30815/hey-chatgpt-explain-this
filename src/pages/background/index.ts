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

const postToContentScript = (payload: { action: string, mes: string }) => {
    const { action, mes } = payload
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action,
            result: mes,
        })
    })
}

const queryChatGPT = async (selectedText: string) => {
    // Replace YOUR_API_KEY with your actual API key from OpenAI
    let API_KEY = null
    try {
        const keyObj = await chrome.storage.session.get('openaiKey')
        API_KEY = structuredClone(keyObj).openaiKey
    } catch (error) {
        postToContentScript({
            action: 'ans',
            mes: error,
        })
        return error
    }
    if (!API_KEY) {
        postToContentScript({
            action: 'ans',
            mes: '[ERROR] Missing API key',
        })
        return '[ERROR] Missing API key'
    }
    // Use the fetch API to call the ChatGPT API
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
                prompt: `Explain this: ${selectedText}`,
                temperature: 0.5,
                max_tokens: 1000,
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
                        action: 'ans',
                        mes: result,
                    })
                } catch (err) {
                    postToContentScript({
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
            action: 'ans',
            mes: err,
        })
        return err
    }
    return ''
}

chrome.contextMenus.create({
    id: 'explain-this',
    title: 'Explain This',
    contexts: ['selection'],
})
chrome.contextMenus.onClicked.addListener(() => {
    postToContentScript({
        action: 'contextMenu',
        mes: '',
    })
})

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    const queryText = structuredClone(message).selectionText
    queryChatGPT(queryText)
})
