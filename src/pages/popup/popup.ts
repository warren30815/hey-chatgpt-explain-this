const inputField = document.getElementById('api_key_input_field') as HTMLInputElement
const saveBtn = document.getElementById('save_btn') as HTMLButtonElement

saveBtn.onclick = () => {
    const key = inputField.value
    chrome.storage.session.set({ openaiKey: key })
    window.close()
}
