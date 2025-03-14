let isResponsePending = false; // Track if a response is being displayed

function appendMessage(content, sender, codeBlocks = [], isHistory = false) {
    const chatBox = document.getElementById("chat-box");

    // Create container for bot or user message
    const messageContainer = document.createElement("div");
    messageContainer.classList.add(sender === "bot-message" ? "bot-message-container" : "user-message-container");
    chatBox.appendChild(messageContainer);

    // Add icon for bot or user
    const icon = document.createElement("img");
    icon.classList.add("message-icon");
    if (sender === "bot-message") {
        icon.src = botIconPath; // Bot icon from HTML
        messageContainer.appendChild(icon); // Add icon before the message
    }

    // Create message box
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender);
    messageContainer.appendChild(messageDiv);

    if (sender === "user-message") {
        icon.src = userIconPath; // User icon from HTML
        messageContainer.appendChild(icon); // Add icon after the message
    }

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

    // Add copy and sound buttons for bot responses
    if (sender === "bot-message") {
        const actionButtons = document.createElement("div");
        actionButtons.classList.add("action-buttons");

        const copyButton = document.createElement("button");
        copyButton.innerHTML = '<i class="fas fa-copy"></i>'; // Copy icon
        copyButton.onclick = () => {
            navigator.clipboard.writeText(content).then(() => {
                copyButton.innerHTML = '<i class="fas fa-check"></i>'; // Checkmark icon
                setTimeout(() => (copyButton.innerHTML = '<i class="fas fa-copy"></i>'), 1500);
            }).catch(err => console.error("Copy failed:", err));
        };

        const soundButton = document.createElement("button");
        soundButton.innerHTML = '<i class="fas fa-volume-up"></i>'; // Sound icon
        soundButton.onclick = () => {
            const utterance = new SpeechSynthesisUtterance(content);
            window.speechSynthesis.speak(utterance);
        };

        actionButtons.appendChild(copyButton);
        actionButtons.appendChild(soundButton);
        messageDiv.appendChild(actionButtons);
    }

    typeText(0);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Enable the send button and allow new requests once the message is fully displayed
    if (!isHistory) {
        isResponsePending = true;
        updateSendButton(); // Disable the send button and show the loading spinner

        const totalLength = content.length + codeBlocks.reduce((acc, code) => acc + code.length, 0);
        const delay = totalLength * 10; // Adjust delay based on message length
        setTimeout(() => {
            isResponsePending = false;
            updateSendButton(); // Re-enable the send button and restore the send icon
        }, delay);
    }
}

function updateSendButton() {
    const sendButton = document.querySelector(".input-container button"); // Select the send button
    if (isResponsePending) {
        sendButton.disabled = true;
        sendButton.innerHTML = '<div class="loading-box"></div>'; // Show loading box
    } else {
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>'; // Show send icon
    }
}

function sendMessage() {
    if (isResponsePending) return; // Prevent new requests if a response is pending

    const userInput = document.getElementById("user-input");
    const message = userInput.value.trim();

    if (message === "") return;

    // Check if the message is an image name (e.g., ends with .png, .jpg, etc.)
    const isImage = /\.(png|jpg|jpeg)$/i.test(message);

    if (isImage && selectedImageFile) {
        // Display the file name as the user's message
        appendMessage(message, "user-message");

        // Display "Bot is thinking..." message
        const botThinking = document.createElement("div");
        botThinking.classList.add("message", "bot-message");
        botThinking.innerHTML = "Bot is thinking...";
        botThinking.id = "thinking-message";
        document.getElementById("chat-box").appendChild(botThinking);

        // Send the image to the server for processing
        const formData = new FormData();
        formData.append("image", selectedImageFile);

        fetch("/upload-image", {
            method: "POST",
            body: formData,
        })
            .then((response) => response.json())
            .then((data) => {
                // Remove the "Bot is thinking..." message
                document.getElementById("thinking-message").remove();

                if (data.success) {
                    // Display the paragraph generated by Gemini
                    appendMessage(data.paragraph, "bot-message");
                } else {
                    appendMessage("Failed to analyze image", "bot-message");
                }
            })
            .catch((error) => {
                // Remove the "Bot is thinking..." message
                document.getElementById("thinking-message").remove();
                console.error("Error uploading image:", error);
            });

        // Clear the input box and reset the selected image
        userInput.value = "";
        selectedImageFile = null;
    } else {
        // Proceed with normal text message handling
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
            body: JSON.stringify({ message: message }),
        })
            .then((response) => response.json())
            .then((data) => {
                document.getElementById("thinking-message").remove();
                appendMessage(data.reply, "bot-message", data.code);
            })
            .catch((error) => {
                document.getElementById("thinking-message").remove();
                console.log(error);
            });
    }
}


// Add this to script.js
const toggleHistoryButton = document.getElementById("toggle-history");
const historyStore = document.getElementById("history-store");
const chatContainer = document.getElementById("chat-container");

let isHistoryVisible = true; // Track if history is visible

// Toggle history visibility
toggleHistoryButton.addEventListener("click", function () {
    isHistoryVisible = !isHistoryVisible;

    if (isHistoryVisible) {
        // Show history box
        document.body.classList.remove("history-hidden");
    } else {
        // Hide history box
        document.body.classList.add("history-hidden");
    }
});
// Handle Enter key press
document.getElementById("user-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

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

// Update the image upload handler
let selectedImageFile = null; // Store the selected image file

// Update the image upload handler
document.getElementById("image-upload").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
        const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
        if (allowedTypes.includes(file.type)) {
            // Display the image name in the input box
            const userInput = document.getElementById("user-input");
            userInput.value = file.name;

            // Store the selected image file
            selectedImageFile = file;
        } else {
            alert("Only PNG, JPG, and JPEG images are allowed.");
        }
    }
});


let isListening = false; // Track if speech recognition is active
let recognition = null;  // Speech recognition object

// Initialize speech recognition
function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Your browser does not support speech recognition. Please use Chrome or Edge.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after one sentence
    recognition.interimResults = false; // Only final results
    recognition.lang = "en-US"; // Set language

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        const userInput = document.getElementById("user-input");
        userInput.value = transcript; // Display the recognized text in the input box
    };

    recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
        alert("Speech recognition error: " + event.error);
    };

    recognition.onend = function () {
        isListening = false;
        updateMicButton(); // Update the mic button state
    };
}

// Toggle speech recognition
function toggleSpeechRecognition() {
    if (!recognition) {
        initializeSpeechRecognition();
    }

    if (isListening) {
        recognition.stop(); // Stop speech recognition
    } else {
        recognition.start(); // Start speech recognition
    }
    isListening = !isListening;
    updateMicButton(); // Update the mic button state
}

// Update the mic button appearance
function updateMicButton() {
    const micButton = document.getElementById("mic-button");
    if (isListening) {
        micButton.classList.add("active"); // Add a visual indicator (e.g., red mic)
    } else {
        micButton.classList.remove("active");
    }
}

// Add this to your existing script.js

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
function loadChatHistory(chatId) {
    fetch(`/load_chat_history/${chatId}`)
        .then((response) => response.json())
        .then((data) => {
            if (data.chat_history) {
                // Clear the current chat box
                const chatBox = document.getElementById("chat-box");
                chatBox.innerHTML = '';

                // Append the chat history messages
                data.chat_history.forEach((entry) => {
                    appendMessage(entry.user, "user-message", [], true); // isHistory = true
                    appendMessage(entry.bot, "bot-message", entry.code, true); // isHistory = true
                });
            }
        })
        .catch((error) => console.error("Error loading chat history:", error));
}