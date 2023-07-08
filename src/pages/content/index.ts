// This script gets injected into any opened page
// whose URL matches the pattern defined in the manifest
// (see "content_script" key).
// Several foreground scripts can be declared
// and injected into the same or different pages.

interface SelectedEventInfoInterface {
    x: number
    y: number
}

interface SelectedEventInterface extends Event {
    info: SelectedEventInfoInterface
}

class SelectedEvent extends Event {
    info: SelectedEventInfoInterface

    constructor(type: string, info: SelectedEventInfoInterface) {
        super(type)
        this.info = info
    }
}

let selectionEndTimeout: NodeJS.Timeout = null
let iconButtonRef: HTMLImageElement = null
let contentRef: HTMLElement = null
const popoverID = 'popover-button-id'
const contentID = 'content-window-id'
let port = null as chrome.runtime.Port
let currentPortName = null as string

const setResponseToWindow = (res: string) => {
    if (contentRef) contentRef.innerHTML = res // the window may be closed before receiving api result
}

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

const getPosition = (el: Range) => {
    const rect = el.getBoundingClientRect()
    return {
        left: rect.left + window.pageXOffset,
        top: rect.top + window.pageYOffset,
        width: rect.width,
        height: rect.height,
    }
}

const initContentWindow = () => {
    const { left, top, height } = getPosition(
        document.getSelection().getRangeAt(0),
    )
    contentRef = document.createElement('div')
    contentRef.style.position = 'absolute'
    contentRef.style.backgroundColor = 'white'
    contentRef.style.padding = '10px'
    contentRef.style.left = `${left}px`
    contentRef.style.top = `${top + height}px`
    contentRef.style.zIndex = '2147483647'
    contentRef.style.width = '50vw'
    contentRef.style.color = 'black'
    contentRef.style.border = 'solid rgb(187,187,187)'
    contentRef.id = contentID
    contentRef.innerHTML = 'Waiting for ChatGPT response...'
    document.body.appendChild(contentRef)
}

const queryGPT = (text: string) => {
    const uuid = Math.random().toString(36).substring(2, 15)
    currentPortName = `content-script-${uuid}`
    port = chrome.runtime.connect({
        name: currentPortName,
    })
    port.postMessage(text)
    port.onMessage.addListener(async (message: any) => {
        if (message.action === 'ans' && message.portName === currentPortName) {
            setResponseToWindow(message.result)
        }
    })
}

document.addEventListener('selectionEnd', (evt: SelectedEventInterface) => {
    const selectionText = document.getSelection().toString()
    if (selectionText.length > 1) {
        iconButtonRef = document.createElement('img')
        // base64 string of logo-48.png, to avoid using 'web_accessible_resources' in manifest
        // eslint-disable-next-line max-len
        iconButtonRef.src = 'data:image/png;base64,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'
        iconButtonRef.alt = ''
        iconButtonRef.style.position = 'absolute'
        iconButtonRef.style.left = `${evt.info.x}px`
        iconButtonRef.style.top = `${evt.info.y}px`
        iconButtonRef.style.backgroundColor = 'white'
        iconButtonRef.style.borderRadius = '50px'
        iconButtonRef.style.padding = '4px'
        iconButtonRef.style.height = '30px'
        iconButtonRef.style.width = '30px'
        iconButtonRef.style.zIndex = '2147483647'
        iconButtonRef.id = popoverID
        iconButtonRef.onmouseover = () => {
            iconButtonRef.style.cursor = 'pointer'
        }
        iconButtonRef.onclick = async () => {
            initContentWindow()
            queryGPT(selectionText)
        }
        document.body.appendChild(iconButtonRef)
    }
})
document.addEventListener('click', (evt: MouseEvent) => {
    const { id } = evt.target as any
    if (id === contentID || id === popoverID) closeIconButton()
    else closeAll()
})

// [REGION] debounce version of selection event
document.addEventListener('mouseup', (evt: MouseEvent) => {
    selectionEndTimeout = setTimeout(() => {
        const noContentWindow = !contentRef
        const haveText = window.getSelection().toString() !== ''
        if (noContentWindow && haveText) {
            const coordinates = {
                x: evt.pageX - document.body.scrollLeft,
                y: evt.pageY - document.body.scrollTop,
            }
            const info = {
                ...coordinates,
            }
            const selectionEndEvent = new SelectedEvent('selectionEnd', info)
            document.dispatchEvent(selectionEndEvent)
        }
    }, 100)
})
document.addEventListener('selectionchange', () => {
    if (selectionEndTimeout) {
        clearTimeout(selectionEndTimeout)
    }
})
// [ENDREGION]

chrome.runtime.onMessage.addListener(async (message: any) => {
    if (message.action === 'contextMenu') {
        closeAll()
        const selectionText = document.getSelection().toString()
        initContentWindow()
        queryGPT(selectionText)
    }
})
