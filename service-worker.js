// This is the service worker script, which executes in its own context
// when the extension is installed or refreshed (or when you access its console).
// It would correspond to the background script in chrome extensions v2.

// chrome.runtime.onInstalled 為 Extension 第一次被安裝時，執行事件的觸發
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension is installed')
})
