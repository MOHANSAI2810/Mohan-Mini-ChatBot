function appendMessage(content, sender, codeBlocks = []) {
    const chatBox = document.getElementById("chat-box");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender);
    chatBox.appendChild(messageDiv);

    let messageParts = content.split("[CODE_BLOCK]"); // Custom separator

    messageParts.forEach((part, index) => {
        // Create text span for normal message content
        if (part.trim()) {
            const textSpan = document.createElement("span");
            textSpan.classList.add("text-message");
            textSpan.innerHTML = part.replace(/\n/g, "<br>"); // Preserve line breaks
            messageDiv.appendChild(textSpan);
        }

        // Insert code block in between text parts
        if (index < codeBlocks.length) {
            const codeContainer = document.createElement("div");
            codeContainer.classList.add("code-box");

            const copyButton = document.createElement("button");
            copyButton.classList.add("copy-btn");
            copyButton.innerText = "Copy";
            copyButton.onclick = function () { copyToClipboard(copyButton); };

            const pre = document.createElement("pre");
            const codeElement = document.createElement("code");
            codeElement.innerText = codeBlocks[index].trim();
            pre.appendChild(codeElement);
            codeContainer.appendChild(copyButton);
            codeContainer.appendChild(pre);

            messageDiv.appendChild(codeContainer);
        }
    });

    chatBox.scrollTop = chatBox.scrollHeight;
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
        appendMessage(data.reply, "bot-message", data.code);
    })
    .catch(error => {
        document.getElementById("thinking-message").remove();
        console.log(error);
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