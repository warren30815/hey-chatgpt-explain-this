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
let panelRef: HTMLElement = null
let iconButtonRef: HTMLImageElement = null
let settingButtonRef: HTMLImageElement = null
let contentRef: HTMLElement = null
let settingRef: HTMLElement = null
const popoverID = 'popover-button-id'
const contentID = 'content-window-id'
const settingID = 'setting-window-id'
let port = null as chrome.runtime.Port
let currentPortName = null as string

const setResponseToWindow = (res: string) => {
    if (contentRef) contentRef.innerHTML = res // the window may be closed before receiving api result
}

const closeIconButton = () => {
    if (panelRef) {
        document.body.removeChild(panelRef)
        panelRef = null
    }
}
const closeContent = () => {
    if (contentRef) {
        document.body.removeChild(contentRef)
        contentRef = null
    }
}
const closeSetting = () => {
    if (settingRef) {
        document.body.removeChild(settingRef)
        settingRef = null
    }
}
const closeAll = () => {
    closeIconButton()
    closeContent()
    closeSetting()
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

const initSettingWindow = () => {
    const { left, top, height } = getPosition(
        document.getSelection().getRangeAt(0),
    )
    settingRef = document.createElement('div')
    settingRef.style.position = 'absolute'
    settingRef.style.backgroundColor = 'white'
    settingRef.style.padding = '10px'
    settingRef.style.left = `${left}px`
    settingRef.style.top = `${top + height}px`
    settingRef.style.zIndex = '2147483647'
    settingRef.style.width = '50vw'
    settingRef.style.color = 'black'
    settingRef.style.border = 'solid rgb(187,187,187)'
    settingRef.id = settingID
    settingRef.innerHTML = '[TODO] setting window'
    document.body.appendChild(settingRef)
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
        panelRef = document.createElement('div')
        panelRef.style.position = 'absolute'
        panelRef.style.display = 'flex'
        panelRef.style.backgroundColor = 'white'
        panelRef.style.boxShadow = '0 0 11px rgba(33,33,33,.2)'
        panelRef.style.borderRadius = '50px'
        panelRef.style.left = `${evt.info.x}px`
        panelRef.style.top = `${evt.info.y}px`
        panelRef.style.zIndex = '2147483647'
        panelRef.style.cursor = 'pointer'
        panelRef.onmouseleave = () => {
            settingButtonRef.style.display = 'none'
        }

        iconButtonRef = document.createElement('img')
        // base64 string of logo-128.png, to avoid using 'web_accessible_resources' in manifest
        // eslint-disable-next-line max-len
        iconButtonRef.src = 'data:image/png;base64,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'
        iconButtonRef.alt = ''
        iconButtonRef.style.backgroundColor = 'white'
        iconButtonRef.style.borderRadius = '50px'
        iconButtonRef.style.padding = '4px'
        iconButtonRef.style.height = '30px'
        iconButtonRef.style.width = '30px'
        iconButtonRef.id = popoverID
        iconButtonRef.onmouseover = () => {
            settingButtonRef.style.display = 'inline-flex'
        }
        iconButtonRef.onclick = async () => {
            initContentWindow()
            queryGPT(selectionText)
        }

        settingButtonRef = document.createElement('img')
        // base64 png string, to avoid using 'web_accessible_resources' in manifest
        // eslint-disable-next-line max-len
        settingButtonRef.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADsQAAA7EB9YPtSQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAABZ6SURBVHic7Z17tFVVvce/vznX2q/DOZwD8hIFI4QDphcb1zHs3qyQlzXENDtAI+/thiVl5eOgdRkE7nBgZTw0w9JUrCxBtNLsZhBS914tR1kmIuccfBQmIK/zXvux1py/+8fmGBfO3nu99tob6DMGgwFr/uZv7j1/e64552/+fpNwkpP+A6f0kEwvADHY84N/ThaVTTVi1Ko5tL9SbasFBv1STipSVjN8fk7HyM8IuTU1x0lvAIpEs19ZoeW/hNmWWuSkNwABPdmvrNZ8bphtqUVOegNgoim+ZR0xIcy21CI1aQDp9v7Ll7dnwnr/+h8BHIwIowGtW9VNN261vxpGXWFD1W7A0aTbc82a9RqAPwhwj5DGe9Jnx1/2XR+z0O2ZfgCJYmVKrQJIMPZPpfimcyjvtw03b7VnW53yKVZERoo7zaR9zeqZ8Uf91hc2NTECLNnZM3z5TutbmtX2QucDADVopX6cfr2z0XfFbbmJKNH55WBNOGuf8wG/8oufyYzP9sifsSICAMeipsyh2KYb/0u9eN1vsmf7rTdMqmoA6W1sLNtpfd4kowOEzwEwjikyWecSG1qYpZ/6NanArxGH6d/8yLXs4Jh9OP4HlafYsc9yveJcdSDW3rrZeSS9jX0baBhUzQCWv5ydpU/PvkCEuwAMK16S50xtz6zyWn+aWQD0mQBNBACoProyvY2PNcyynL5b/86x6LRiz1kRZTtly6Eu7rppq/pSsFb6J3IDSO/ITlzWZj0OoTeD+Rw3MgzcsKwts9CLHtWRuQHAeb4aeRROTiS7bWejF5nFW5wH7B5xvpuyKk9x66D42vVPqr2tT9uRbzxFNglM7+IGVpmlDNwA4Lhh0QW2IJ6Xnlz303IFl+3sv4aI1uH4V8pxlJoEvg0B8Ub1vbWzjf8oV7R1q/217CHjS+Dy1R6nhgBzqHquzpBXrpxBb3qvwYfOKJQAwLK2zM8J/KGA1WgAq3NmduXX3zms+9iH6Z3ZSZr0cgAfd1uhKwM4gjlEv4a4/sydM80txz5b/ExmvOo1N+V75AV+Ov9ojJQ+8M25cmSwWtwRmQEs39m/CETfCak6i4FfCaBDEx0S4LGscR4IF8HjZ/JiAAMYSe6SMf4rC94Dxgi26UzbolHgcL7OxDD1wzWzjKtCqawMnic3fsnFchvidmItAO/f+PGkCLiMARBz4QcX4Y6Gk6FGJ0ONAP4p7LpJMChlLw273mJENgk8MmQ/EZW+ExUjxbtX/2vyr1Hpi3YVQPy9SPWdgBgJ/d0o9UVqAGJS6pcA/halzhMJYULtHm3cHqnOKJWliTSAH0ap80TCTDq/D+J38EPkG0Es2dOmyqkEJfQdkeuMWiGYaXl7phtAfeS6B8HPMrASkASvuxIGCqNkZETvCyBiAPsi11vjCKntqDsfqJ4zqCZ+/bWE1uTL4xmU6J1Bu6wzAIyOWm+tww7JG7blp0WtN3ID0A5/KmqdJwqUF9+IWmekBrBkV+8IiOA++pMVu19Ob/0fnhSlTk+rgPQublAq+zCxfkIk8hvT72jqcivbwiyndFi/ANMs782sHLWyChjASPHBYUNoTHo6OW5lFj+TGc+WudLJ0uz6lDjfiyvZkwEsb7NuB3DzkX/mmLCFGN8Xe5M/KdXgdHvPaZrNhwCe40VfFNSaAQCAkeLOWMx+36o58ZeKlUlvY6OXnVYnIxbZFk2ALnRlrFE9d8cc40K3ulwbQHpHdqKW+iUA8UEe7wHwA5a88daJqReOLPWwtN0aK0BXE/haMEa51RUltWgAACAka1mvf2Ok9M2rL4o9DwBgFjc8nZ9PjrzO7pcXaBvHrxwISJzmzFxzsbnVjR7XBrCszXqcgMvKl+QegA6i4PYd47b+alGrBnA0QrImAaU1GazK95lZp/fdeal09d27MoDl7ZkZYP6Vm7K1iLYJTpagcwIqR9CKAAZYEf76NwFBgBCAIMCUR/4IwKjKyjwcksOdpatnmreVK1fWANLb2NBjsn8ETpw4OXYIuV4Bu0/C7hPQ+eIf87WDxesxBJAwgVQMSJqArIkoCnfIOOdykobdO5esUuXKngjSozOfBVD7nc9Arkcid1gi3ysR9FweADga6MsV/hCAZAwYEi/8qXVUjuJ1Tep7AFpKlSs5AizZ2TPcJKMDJc/tVxkGsp0GrH0GtO3dt1VqBCiGIYChSaAhUTjJW6uQZJYj8pO/+f7ErmJlSo4AJoyvoFY7n4HMIQPWWwbYibYXHA0c6ge6MkBTEmio0XkkKyLZbz6GEvERRb+59Mu979JC/gkRHhx1i5MR6HvThNMf/KXsZwQ4lpgERtQD8Zr7pgokR6orVk83Bo2nKPoNKhJrUYOdb+030LUrHkrnh0VeAW92FUaFWsTpo/uLPRv0W1zebl1BRDMr1yTvaIfQ/Woc1l4zlAleJejOAHu7ARW5V780tiWGFctPUORnRD0AXO/zVxqVJXR3xGH31c6vvhgZuzAa5F3v5EeAZCaIQ4M9Kj4HKIRZPYEAGTbCwLEEel6PQVdoohfGHGAwBAGjGwr7CNVExjifaFBzvzHD3DzY86I/qfSUREcWyQuY8GTlmlca2xLoejVesc6vJJqBfT1AroojgZHShziVay7W+YCLncAWZjm1PbPqSFRvZDhZQs8r8cK2bQWp1AgwgBTA6UML28tRYjboP+0ZJy4sd8zcgzMos5DA3wFQ8UFNO4SujrivjR2vVNoAgMLG0djGiLaSCUg2qfWrZxmu8im4btKtzckHAG5BIUS7cjDQtzsWSedHhaOB/b0RKCIgMdxZ6bbzAY9HwlY01z1OgOd0LV6w3jKR76392b5XMjbQVdItE5xYg/PbNTPML3uR8bzRkzWzt8XtxOcBpLzKlsO2BKz9Fdt70gxsB+NZQWjTjL0gdDYk8W6tMRqEs7TGJEdhQl6FEsJ+HIetgkOpEjuGJMBIGVd6lvOjbHmb9QSAuX5ki8Io7PBlQv/1byfgPmViw3c+4i7z9/z7+F2KsCLr4IOO4z/N3GDEjcJ8IGyMOr3nm5fKsZ7lfGkjdIS9G5c5ZITb+YwdICy5ex6eHDii5paNn6KXAHwEzKJlPVZk8rjJUYMehfNMzgF6sgVPYphIqXf7kfP3jTMO+JIrVh0D1luhjYsOAUudbpx/93z6mdfO/38Q6U0L6ctEGDYkhqfDcv12WYXPHCqCfPWJr2+dCGeE+QFyB0Nz6b4FjY+s+xg9G0ZlA/xsEVkAZsxfz9f2ZXCX4mDxFI4GenPhjgKs6Ew/cr4+COvg+ff+XhlgHQjl1/8XJXHR3SF3/tFs/CTdnUriEikQeH8v7BWBVjjLj5xnA0jvzE46ko0rFHLdMow1/wEmXHLPR6noyZew2PRJ2jI0htmGCLYf4migPxdWqwDHEo1+Ek16NoAjefhC26XJdQbeI7Whcfm351F7GO1xw4+upm2pGK4LOifoDdEAAEBlxL1eZTwZwPL2/k/DQxLGcmiHCgc4A0BAupLDfjEeuZrWpWLYFqQOKx/u2QG7T0y4cbPzoBcZVy/fNLPQHZnrwQg1gZHdK4Id7mDssLsReUTtAKIBlxmHcTDIEjFjh3vKONcpP3HjZrthqGnMcxNfWHQQa2GW57Tl3llIuU6LUIGkiL1vxJA77H8EIMbcdQuoau5qAJh/P3+1O4v/9CtfHy+cJwwbGeeMTDk/NSU9+JfRxq+LeQUpvYNjCn1nk5RTAUwAcA6AqQCaAdSF37S/c3hnomTQRkkIL97dgmmB1vlhwCzm3oN+W/nbMTQkMK4p7EYdAwHSYJtiOCxN/TokXhFC/zaeMh8ztMxkCTJy15u2yX/nA2CN+6re+QBApBP38lO2wuV+xB1VWBEYlfR/MaBsMmFjlAM5CsCFgLwqA6wTqNK9QSobSK3mGGom3ZxBuCWIvK3Caol3quZ3dXKBVL/o1rETBQ9/ml40DGT9yp+SBqCCDP+M34bYlFAwJV7zK3tKGgAC7P0LQluILQkFCfjehdRVnMlUzQB0gA0QBURynYoXhMArfmVPSQMYyGnjB8GI4oSdJwTjsF/Z0F3DHjj5Dt/9A09UzwCEf7PXVHupZjX5D6OvZo6BqhmACKBZAp7PvlUarTHRr6w4FQ0Ahv8RgAHfV8JXCq3hO8PnKWkAMhbIAN4TYlNCwdZ4h1/ZqMPGjqZqBmDE/a8DCTjv+h9xzSSebFnP0/w6g4DqG0BVFiEyEUgtORLzw2pLUFghHUS+mgZgCJVMVMMdLEyGNBnK53lABj4F5ruq7RFMp9l43sElfuUNUWFPIFDSHVz+QAjUdIAWgeDqNmwv9O2OIRvgTCATPvzteVTVyyhb7ufbe7NvJ9D2TH0CGDEkzBYVkAm2jJR+zBD8UMkDIW4qSzML3Z75AgqBoaFFcGQ7Jfp2+7lI/G06ZD3Ou+tDFPLxSne0PMJDsodxyFa+bkMHAIysDznxJAGJRrVpzSy5wM0dRK4GnzSRXtGcuhPE1wZv4d+J1+ugpxEm6V7/v76gqG48GaTzgUIa2jBJNKkH1sw25rm9gMpbePjkuu8ixIsfyWDE64P5Qhm45dpH+L0hNck1Cx7k66w83h+kjrp4uHsAsXr9yppZxtVeZDxPPwSLFQhx5RAbFtgZboDxk88/ys1htMcNCx7kGb0W1gatpz7koT+W0td4FfMeGTQl0QHgv73KFSPWoCDMwPZ0mnbw1Oc2VP6+nY+t50v6MngqaHygIcId/o2k7rr9A6bnOAVfH4II2/3IFakLqZEhpNIijGfC/372YQ4tbO1YFjzI1/Vk8HNHB58IDw05BYUwtK8r5319EM14I8zt6/hwB/3hJH0eQQJPf/YRvvUg8LVN88K5iPnjD3FDJoMnuvqDvfMHkCL8/AAk6A0/cn5HgJF+5ErUh7rRoSXUM4jxlRGMFz/3CF8BZt9WlU6z0XI/397dhwNBJ3xHMywVvguYgRF+5PwNZezf81WMxDAH2cMSjhXatthkZvz42o3YQRv4PhbYcPc8cnVncct6nsYK6ecdXGJnw8kMMkDcKGz+hA3bNM6PnGc7TL/e2ahz8TdRgSRRjiXQ9Uq8Ut4JBvASgGcBtDPjb0Kg60A/3q0VRgGYoICzHQcTgjh2yjG2sUJJoiS4sQlnerkzEPAxAnAuvhQV6HwAMFIaqZE2rLcqkouSULj65lygMAQzAz0VTt12NE2pyt0pwApkOepReHSVewwPt65goNVTyzySGuXAHFJj+dZDIGkWDKCS5Lrlha2bc2VvCjsa1wawrC2zEIyNXmR8QUD9+Dxk8L2BmsGQlYkAPg4Gsl2xJYu3OA+4FanZZNEqT+jeVflM4ZXOFSyokCw6FvHdK6Eki/5iG9fHKfMjYlwabvPc4fQLdL0Wr2h24koagCBgzNDq3SVkpPQhHctf8K05ydeLlSl+X8DO7KQEMr+vVucDgFGn0fjOHCjAAdJqIQgYXcXOBwDHEsPJirfdvNWeXaxMkTuDMjM06edQ5dtCgMLKoHFi7oSaExiyMOwnauDKLZWnWH+nfKp1q7ppsOeDGoCArgdQgYy2/pBxRuOkHMyAruMoSJrA2Cq880uiiKCcQQNXis4Blu3s31JrN4cBhWvjrH3h3RwW5hygKVX5pZ4fzJQ+fOdcOXywZ0XnAJL1jUDwjJhhkxrpoHFiDmaqdvYKBjKA12LnA4AxhIseEik+CZxa/xIY91SmScEwUhpDJ+Yw5Ay7qhNEKQoHOiu1vRsG8Xq9vditoUCZTR0bzi2A/7DnilK4HgXDp2Yx5EwbIkCkkVcMAQyvK2T3qoRjJyxIMqs6u+QlEiUN4KtTGg6BgwU9VBwqeBKbmrNoOCuP+FBVsWjbunjhLsBxwwoHOmr55nAAiDXox0rdHA643Amc0p79E8Dnhte0ysKKkO8RsPsk8r2iZDLqUpNAQxSueEmaheNb1Qzi9IqMcy4nadi9c6mku8tdXEBb5mIN3hpO06JH2wQnR9A5ASdHYEWALuQqfmOPAKEQri6oEKYVk4W/I7nmrUIkhztLV880yzqGPNwbaD1OwGUuinYBOAQggRqM4z+Wg3+uyP1QoUIGKyGglIIJVf7FY9bpfXdeKse4qdv13FUqsVhLPQcY9ITMHgA/EEJvSE8a8sLAf6bb+k9XEAsJfC0AVw36BwWECWXUqacNqW5aNTP+4sD/t27Lzee8vMHulxdoG8fH1REgU/oqt3o8vdVuabO+zsAXj/wzx4QtxPi+2Jv8SanM1Et29gw3yHyIwL6DKCtFLY4ARoo7zaH2e1e/L/5ysTLpbWz0stPqZMQi26IJA0m34o3qd2vnGK4PhXgygPQublAq+zCxfkIk8hvT72hyfcV8C7Oc0mH9AkyzvOisNLVmAEZKHxw2RIxxk+p9gMXPZMazZa50sjS7PiXO93IsLNJ5bbq95zTNxnYAo6PUW4paMgBhQonhuSnllm6h6oxKEQCkJzccZKJvR6nzRMKsU9ui7HygCiliNPj+qHWeKHBMRx7pHLkBrJycehPA3qj11jpksLpjeuyF8iXDpVpbHX1V0luzCMFVOewQvQEUQrVqZhJYK2glTDBH3h+RK1z2ijUNqL1Ur9WGFaj11/mWqPVGbgCkqGbSu9UanBWRHr0Hol4GFoa40C6ePNmwM8YFLTs45KxBpYnUAHSHNQfAGVHqPJHQNuS4fc4Xy5cMj2hfAUyfiFTfCYiTFZ+OUl9kBvClVw8PhTt38imNY9G4xc9kxkelL7KjjPF8fAEIYW289zHwKwF0MGM/EcZx4WrbixBB8KqR1F1C4i8weTdpjFQ2jVNZMYZVcN8KawJb5koArl26QYjMAJjEZRT8ML8ixjcylLzt9mY67t6g9I7sRBZqGRP9e1BFg2HWq1dlghetudg87nTU0q081nLUo7lueWHQj+lkqWgoV9hE5g1M7+IGVpmlR6KM/cx0bQH+aLq5rmxu4GVtmYUEvgcuDNyVN5CAZJNav3qWsbBc0dbNuduyXbElfoyACDCHqufqDHml10wffon8mGN6R3aiknq1y+Nlb8Ogq29tTrqOe1/eZl0P4I5y5dwYQKJJbVoz25jnVvfiLc4DmcPyk27LA4VjXDKlrxpsdKkkVTvnuvzl7CxIXgvmc8qVJeCOrzSnbvRS/5EE188DmFaqXDkDkAlt3XWZqHebe3eA63+h/mj3iLIZ1mWMc/EGvmXVDPl1L/WHRdXOva6Ymtgi9iSmMeMLKBl8Qr98eXJy0MjWUqSJNBdeA4EwUvyY184HgD3jxIVGioseOifJnGhSm4Y3UmO1Oh+o8r2B6enk3Dol9S2bnUlgrMPxsYjtIp5dsInIl6dMsnw6aBsNwQ/5kdt0DuXNYbl/ljE+LkNHvF5vlyPyk9fMNualp5PvS6fDoKZCHb7clp0swGsB/iDAPUIa70mfXfxgZDmOvAb6geJp30q9Akgw9k+leLk0K6W4eas92+qUT7EiMlLcaSbta1bPjD/qt76wqSkDGCDd3n+5huhdMTkZeEK0vM36M4Dzij0vZQAyobN3fVgG3rto3apuYujha2eYS4LWFTY1GdOanlxXNJrVB+0oYQClEAYOhNGANTPkqjDqqQQncPCTO4h5p29ZQ78WZltqkZPeADREu19ZISi0tPi1yklvAJJ1m19ZLdSzYbalFjnpDQBWqg0+Mw0aTuyEjYh2y/8BcqcsLPbSp2gAAAAASUVORK5CYII='
        settingButtonRef.alt = ''
        settingButtonRef.style.backgroundColor = 'white'
        settingButtonRef.style.borderRadius = '50px'
        settingButtonRef.style.padding = '4px'
        settingButtonRef.style.height = '30px'
        settingButtonRef.style.width = '30px'
        settingButtonRef.style.display = 'none'
        settingButtonRef.onclick = async () => {
            initSettingWindow()
        }

        panelRef.appendChild(iconButtonRef)
        panelRef.appendChild(settingButtonRef)
        document.body.appendChild(panelRef)
    }
})
document.addEventListener('click', (evt: MouseEvent) => {
    const { id } = evt.target as any
    if (id === contentID || id === popoverID || id === settingID) closeIconButton()
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
