function appendMessage(content, sender) {
    const chatBox = document.getElementById("chat-box");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender);

    chatBox.appendChild(messageDiv);

    // Detect and separate code snippets from normal text
    let parts = content.split(/<pre><code>|<\/code><\/pre>/);
    let isCodeBlock = false;

    parts.forEach((part, index) => {
        if (part.trim() === "") return;
        if (isCodeBlock) {
            appendCodeSnippet(part.trim(), messageDiv);
        } else {
            messageDiv.innerHTML += part.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") + "<br>";
        }
        isCodeBlock = !isCodeBlock; // Toggle between text and code
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendCodeSnippet(code, parentDiv) {
    const codeDiv = document.createElement("div");
    codeDiv.classList.add("code-box");

    codeDiv.innerHTML = `
        <button class="copy-btn" onclick="copyToClipboard(this)">Copy</button>
        <pre><code>${code}</code></pre>
    `;

    parentDiv.appendChild(codeDiv);
}

function sendMessage() {
    const userInput = document.getElementById("user-input");
    const message = userInput.value.trim();
    if (message === "") return;

    appendMessage(message, "user-message");
    userInput.value = "";

    const botThinking = document.createElement("div");
    botThinking.classList.add("message", "bot-message");
    botThinking.innerHTML = "Bot is thinking...";
    botThinking.id = "thinking-message";
    document.getElementById("chat-box").appendChild(botThinking);

    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById("thinking-message").remove();

        let botReply = data.reply;
        let parentDiv = document.createElement("div");
        parentDiv.classList.add("message", "bot-message");

        appendMessage(botReply, "bot-message");
        chatBox.appendChild(parentDiv);

        chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch(error => {
        document.getElementById("thinking-message").remove();
        console.log(error);
    });
}

function copyToClipboard(button) {
    const codeElement = button.nextElementSibling;
    navigator.clipboard.writeText(codeElement.innerText).then(() => {
        button.innerText = "Copied!";
        setTimeout(() => button.innerText = "Copy", 2000);
    });
}

document.getElementById("user-input").addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

window.onload = function() {
    const chatHeader = document.querySelector(".chat-header");
    if (chatHeader) chatHeader.style.animation = "fadeIn 2s ease-in-out";
};
