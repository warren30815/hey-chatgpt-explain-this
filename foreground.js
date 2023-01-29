// This script gets injected into any opened page
// whose URL matches the pattern defined in the manifest
// (see "content_script" key).
// Several foreground scripts can be declared
// and injected into the same or different pages.

let selectionEndTimeout = null
let iconButtonRef = null
let contentRef = null
const popoverID = 'popover-button-id'
const contentID = 'content-window-id'
const eventList = ['mouseup', 'selectionchange']

const closeIconButton = () => {
  if (iconButtonRef) {
    document.body.removeChild(iconButtonRef)
    iconButtonRef = null
  }
}
const closeContent = () => {
  if (contentRef) {
    document.body.removeChild(contentRef)
    contentRef = null
  }
}
const closeAll = () => {
  closeIconButton()
  closeContent()
}

const queryChatGPT = async (selectedText) => {
  // Replace YOUR_API_KEY with your actual API key from OpenAI
  let API_KEY = null
  try {
    const keyObj = await chrome.storage.local.get('openaiKey')
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

const getElementPosition = (el) => {
  const rect = el.getBoundingClientRect()
  return {
    left: rect.left + window.pageXOffset,
    top: rect.top + window.pageYOffset,
    width: rect.width,
    height: rect.height,
  }
}

document.addEventListener('selectionEnd', (evt) => {
  const selectionText = document.getSelection().toString()
  if (selectionText.length > 1) {
    iconButtonRef = document.createElement('img')
    iconButtonRef.src = chrome.runtime.getURL('logo/logo-48.png')
    iconButtonRef.alt = chrome.runtime.getURL('logo/logo-16.png')
    iconButtonRef.style.position = 'absolute'
    iconButtonRef.style.backgroundColor = 'white'
    iconButtonRef.style.height = '24px'
    iconButtonRef.style.width = '24px'
    iconButtonRef.style.left = `${evt.info.x}px`
    iconButtonRef.style.top = `${evt.info.y}px`
    iconButtonRef.style.zIndex = '2147483648'
    iconButtonRef.id = popoverID
    iconButtonRef.onmouseover = () => {
      iconButtonRef.style.cursor = 'pointer'
    }
    iconButtonRef.onclick = async () => {
      const { left, top, height } = getElementPosition(
        document.getSelection().getRangeAt(0)
      )
      contentRef = document.createElement('div')
      contentRef.style.position = 'absolute'
      contentRef.style.backgroundColor = 'white'
      contentRef.style.padding = '10px'
      contentRef.style.left = `${left}px`
      contentRef.style.top = `${top + height}px`
      contentRef.style.width = '50vw'
      contentRef.style.color = 'black'
      contentRef.style.border = 'solid rgb(187,187,187)'
      contentRef.id = contentID
      contentRef.innerHTML = 'Waiting for ChatGPT response...'
      document.body.appendChild(contentRef)
      const res = await queryChatGPT(selectionText)
      if (contentRef) contentRef.innerHTML = res // the window may be closed before receiving api result
    }
    document.body.appendChild(iconButtonRef)
  }
})
document.addEventListener('click', (evt) => {
  const { id } = evt.target
  if (id === contentID || id === popoverID) closeIconButton()
  else closeAll()
})

class CustomEvent extends Event {
  constructor(type, info) {
    super(type)
    this.info = info
  }
}

// [REGION] debounce version of selection event
eventList.forEach((eventName) => {
  document.addEventListener(eventName, (evt) => {
    if (selectionEndTimeout && evt.type === 'selectionchange') {
      clearTimeout(selectionEndTimeout)
    }
    selectionEndTimeout = setTimeout(() => {
      if (
        !contentRef &&
        evt.type === 'mouseup' &&
        window.getSelection().toString() !== ''
      ) {
        const coordinates = {
          x: evt.pageX - document.body.scrollLeft,
          y: evt.pageY - document.body.scrollTop,
        }
        const info = {
          ...coordinates,
        }
        const selectionEndEvent = new CustomEvent('selectionEnd', info)
        document.dispatchEvent(selectionEndEvent)
      }
    }, 100)
  })
})
// [ENDREGION]
