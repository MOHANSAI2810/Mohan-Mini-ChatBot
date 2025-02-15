function appendMessage(content, sender) {
    const chatBox = document.getElementById("chat-box");
    const messageDiv = document.createElement("div");
    
    messageDiv.classList.add("message", sender);
    messageDiv.innerHTML = content.replace(/\n/g, "<br>");
    
    chatBox.appendChild(messageDiv);
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
        appendMessage(data.reply, "bot-message");
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
    chatHeader.style.animation = "fadeIn 2s ease-in-out";
};
