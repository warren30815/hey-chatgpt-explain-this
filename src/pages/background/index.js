// This is the service worker script, which executes in its own context
// when the extension is installed or refreshed (or when you access its console).
// It would correspond to the background script in chrome extensions v2.

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

const queryChatGPT = async (selectedText) => {
  // Replace YOUR_API_KEY with your actual API key from OpenAI
  let API_KEY = null
  try {
    const keyObj = await chrome.storage.session.get('openaiKey')
    API_KEY = JSON.parse(JSON.stringify(keyObj)).openaiKey
  } catch (error) {
    return error
  }
  if (!API_KEY) return '[ERROR] Missing API key'
  // Use the fetch API to call the ChatGPT API
  try {
    const response = await fetch('https://api.openai.com/v1/completions', {
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
      }),
    })
    const data = await response.json()
    if (data.choices) return data.choices[0].text
    else
      return '[ERROR] ChatGPT failed, please check your API key or use another sentence'
  } catch (error) {
    return error
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const queryText = JSON.parse(JSON.stringify(message)).selectionText
  queryChatGPT(queryText).then(sendResponse)
  return true // return true to indicate you want to send a response asynchronously
})
