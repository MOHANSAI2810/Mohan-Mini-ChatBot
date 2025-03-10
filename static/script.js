function appendMessage(content, sender, codeBlocks = [], isHistory = false) {
    const chatBox = document.getElementById("chat-box");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender);
    chatBox.appendChild(messageDiv);

    let messageParts = content.split("[CODE_BLOCK]"); // Custom separator

    function typeText(index) {
        if (index >= messageParts.length) return; // Stop when all parts are processed

        const part = messageParts[index].trim();
        if (part) {
            const textSpan = document.createElement("span");
            textSpan.classList.add("text-message");
            messageDiv.appendChild(textSpan);

            let formattedPart = part
                .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
                .replace(/\n/g, "<br>");

            if (isHistory) {
                // If loading history, display all at once
                textSpan.innerHTML = formattedPart;
                if (index < codeBlocks.length) {
                    typeCode(index);
                } else {
                    typeText(index + 1);
                }
            } else {
                // If normal chat, display letter by letter
                let i = 0;
                function typeLetter() {
                    if (i < formattedPart.length) {
                        if (formattedPart.substring(i, i + 3) === "<b>") {
                            textSpan.innerHTML += "<b>";
                            i += 3;
                        } else if (formattedPart.substring(i, i + 4) === "</b>") {
                            textSpan.innerHTML += "</b>";
                            i += 4;
                        } else if (formattedPart.substring(i, i + 4) === "<br>") {
                            textSpan.innerHTML += "<br>";
                            i += 4;
                        } else {
                            textSpan.innerHTML += formattedPart[i];
                            i++;
                        }
                        setTimeout(typeLetter, 10);
                    } else {
                        if (index < codeBlocks.length) {
                            typeCode(index);
                        } else {
                            typeText(index + 1);
                        }
                    }
                }
                typeLetter();
            }
        } else if (index < codeBlocks.length) {
            typeCode(index);
        }
    }

    function typeCode(index) {
        const codeContainer = document.createElement("div");
        codeContainer.classList.add("code-box");

        const copyButton = document.createElement("button");
        copyButton.classList.add("copy-btn");
        copyButton.innerText = "Copy";

        const pre = document.createElement("pre");
        const codeElement = document.createElement("code");
        pre.appendChild(codeElement);
        codeContainer.appendChild(copyButton);
        codeContainer.appendChild(pre);
        messageDiv.appendChild(codeContainer);

        if (isHistory) {
            // Display full code instantly when loading history
            codeElement.innerHTML = codeBlocks[index];
            typeText(index + 1);
        } else {
            // Letter-by-letter display for normal chat
            let j = 0;
            function typeCodeLetter() {
                if (j < codeBlocks[index].length) {
                    codeElement.innerHTML += codeBlocks[index][j];
                    j++;
                    setTimeout(typeCodeLetter, 5);
                } else {
                    typeText(index + 1);
                }
            }
            typeCodeLetter();
        }

        copyButton.onclick = function () {
            navigator.clipboard.writeText(codeBlocks[index]).then(() => {
                copyButton.innerText = "Copied!";
                setTimeout(() => (copyButton.innerText = "Copy"), 1500);
            }).catch(err => console.error("Copy failed:", err));
        };
    }

    typeText(0);
    chatBox.scrollTop = chatBox.scrollHeight;
}
function confirmLogout() {
    document.getElementById("logout-modal").style.display = "flex";
}

function closeModal() {
    document.getElementById("logout-modal").style.display = "none";
}

function logout() {
    window.location.href = "/logout"; // Redirect to logout route
}
document.addEventListener("DOMContentLoaded", function () {
    fetch("/get-username")  // Flask route to fetch username
        .then(response => response.json())
        .then(data => {
            document.getElementById("username").textContent = data.username;
        })
        .catch(error => console.error("Error fetching username:", error));
});


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
    fetch('/get_history')
        .then(response => response.json())
        .then(data => {
            const historyBox = document.getElementById('history-box');
            if (data.history) {
                data.history.forEach(chat => {
                    const historyButton = document.createElement("button");
                    historyButton.classList.add("history-button");
                    historyButton.innerText = chat.date;  // Show the date of the chat
                    historyButton.onclick = () => loadChatHistory(chat.chat_id); // On click, load history

                    // Insert the new history button at the top
                    historyBox.insertBefore(historyButton, historyBox.firstChild);
                });
            }
        })
        .catch(error => console.error('Error fetching history:', error));
};
// Function to load chat history into the chat box
function loadChatHistory(chatId) {
    fetch(`/load_chat_history/${chatId}`)
        .then(response => response.json())
        .then(data => {
            if (data.chat_history) {
                // Clear the current chat box
                const chatBox = document.getElementById("chat-box");
                chatBox.innerHTML = '';
                
                // Append the chat history messages
                data.chat_history.forEach(entry => {
                    appendMessage(entry.user, "user-message");
                    appendMessage(entry.bot, "bot-message", entry.code);
                });
            }
        })
        .catch(error => console.error('Error loading chat history:', error));
}