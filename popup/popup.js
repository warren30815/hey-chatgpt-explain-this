const inputField = document.getElementById('api_key_input_field')
const saveBtn = document.getElementById('save_btn')

saveBtn.onclick = () => {
  const key = inputField.value
  chrome.storage.session.set({ openaiKey: key })
  window.close()
}
