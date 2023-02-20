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
const eventList = ['mouseup', 'selectionchange']
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
        iconButtonRef.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAFjAAABYwGNYDK3AAAAB3RJTUUH5wEdBRIIKGIdYgAACrZJREFUaN7Vmnuw1dV1xz9r7d8998HlfRXDKDparNqJ2BZim0rFqGTE5uFIrVaJJSIm0hgJGNMknZAHTWtKHo3aMBEFbdSobcCkTTRE02J1MMGJTAoJ4yBCFJqgvO7znLPXt3+cw70HxMsVaTusmTv3nPNbe+/1Xe+99884SvTI9wUCi8Czn5hCV1hwXQo1u1jumfuHF7a5r9cAmDbLjsq6b2mWJ58UyeBXZSgCXAyjqukpmOPBBSlo9RApKHvwnx7clcL/1aQ9KYuWsgMw+YYjF+OIR96zWrUPEs2ywqs6x8U8Dy51cVzKkALqAPDa3+6UeSwFd3jYWleUU81wnDun+L8DsGJ1UC2M49v3sWtX+8QkrkqZOR6c6IG5IGXwoCuFcgpG1AFQB7bDxb0pc29fU/eG1nKbjGDK9U3/ewC+8ZQot0OpS6QK4DamqGpmCmanzBQXqS40LnLKPOvBfSnUl4JrPDjPg6Z+y4hIwXoPLTf5t1OOHSmMJhkVE5PmpaMH4PZna+6S+gSy1oL4Yw+bV/fz9pTBBR4oBds8WJaC+9VVeaFlGHhfcbKLmZb5UApOTRnfb6Ukei14yoM7msJWk9WZcm29s+Yf3q0GBXD7c+LZT77MlM+Px92SlXW2Z+Z6MDMFHR41bdY1/xsX3/PMHU2y58mqFmak3lpmKprkXrazPPhQylzmYvz+sVYDs9vFoyn4hlXyusK83DFyB7v2HcdvfbR56AAk8fl10NYEZKi8WmXYqHSyBVenzCwPztgveP1/rwdPpMxdKexxE11J0DECcsC0abV5n/h2huyANZcquiCFrvdgegraTf2xgQcvpuBbSbpv4jVf2PTi8k9TZKMrwRldji2ywQEsfk54AQQUYmTKvCeJD3vW5BSUfEDwnIINHvyjha0sqrHdcUxwxaWHNuyPviVM0FQNSlXrQLrUxTwT56RMU4NSqin0vAdLqdq/SJVXSyT6TJz+idKhASzeICyBKlAYzVbhPAs+nILpLoanEP1BGmxJwcOFWCrZi01ZkbPhDtdMHzysnr5bmIFClPbKNIwTXXzQM1enYGK/W4bwoNuDf0/BHab4cZG9qyUSVYPj/9oGAHz2F7VcXSSsWuHtSVzrwZUejN8foHUAez1Y6cHdZHs6QaUIOHk4rN8JN80YWlLTIvH4aZlRPUYRRiFLhCabNLseX2PrAPBaoO/04OEUtrwlfF3VyIrMuM8UNQCf2yCy8GS838VnUubtJqwh5ZVT6BmvFaAf5rJ2t7qRBXOnvbWW4Pk7VVNjCMvRnrBpHsxLofM9aPUBGUjBJg++6Jn7wsgnLKoD+OxGIRjl8LgHUxoyg1KwwcWyVNWDI/bY9p52ccMf1c1nR6efAfjFVzKVJFLFcLcOV1zuwVzPnJ2Cor84ik3J7PzI2jFuUUF/ojUoASc3zPkqxr2CFd7FerWivaODlt7g79cX3DJp6MI//ZAO+P7OK14/trPNGd6TqZaAHDvbx/330t6Xj/+xmc0CPgi8rc7aoWA0xg6AwSrFhkh8yiv05HZQGB97h79pzT72oNgXoAiKgCR48kuCDrhg9gCQxoZu85IyvXtGAPzSjc8BvwO8f/'
            // eslint-disable-next-line max-len
            + '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'
        iconButtonRef.alt = ''
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
eventList.forEach((eventName: string) => {
    document.addEventListener(eventName, (evt: MouseEvent) => {
        if (selectionEndTimeout && evt.type === 'selectionchange') {
            clearTimeout(selectionEndTimeout)
        }
        selectionEndTimeout = setTimeout(() => {
            const noContentWindow = !contentRef
            const isMouseUp = evt.type === 'mouseup'
            const haveText = window.getSelection().toString() !== ''
            if (noContentWindow && isMouseUp && haveText) {
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
