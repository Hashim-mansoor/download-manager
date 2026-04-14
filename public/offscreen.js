// Offscreen document for audio playback in Manifest V3
// Service Worker cannot directly play audio, so we use offscreen document

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'play-audio') {
    const audio = new Audio(message.file)
    audio.play().catch(error => {
      console.error('Audio playback error:', error)
    })
    sendResponse({ success: true })
  }
  return true
})

console.log('Offscreen document loaded')
