// This code snippet restores the original console.log function if it has been overridden in the chat screen

// 1. Create a temporary iframe
const iframe = document.createElement('iframe');
iframe.style.display = 'none';
document.body.appendChild(iframe);

// 2. Steal the clean, native console.log from the iframe
window.console.log = iframe.contentWindow.console.log;

// 3. Test it
console.log("It works! Logging is restored.");
