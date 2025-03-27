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
    if (isHistory && content.includes("🔍 Found image for")) {
        const urlMatch = content.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
            const imageUrl = urlMatch[0];
            messageDiv.innerHTML = `
                <p>${content.split('\n')[0]}</p>
                <a href="${imageUrl}" target="_blank">${imageUrl}</a>
                <img src="${imageUrl}" style="max-width: 200px; margin-top: 10px;">
            `;
            return;
        }
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


let selectedFile = null; // Store the selected file

async function getWeather(city) {
    const response = await fetch("/get-weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
    });
    const data = await response.json();
    return data;
}

async function getNews() {
    const response = await fetch("/get-news");
    const data = await response.json();
    return data;
}

async function translateText(text, targetLanguage) {
    const response = await fetch("/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target_language: targetLanguage }),
    });
    const data = await response.json();
    return data;
}

function sendMessage() {
    if (isResponsePending) return; // Prevent new requests if a response is pending

    const userInput = document.getElementById("user-input");
    const message = userInput.value.trim();

    if (message === "") return;

    // Display the user's message
    appendMessage(message, "user-message");

    // Check for YouTube URL first
    if (isYouTubeUrl(message)) {
        // Display "Bot is thinking..." message
        const botThinking = document.createElement("div");
        botThinking.classList.add("message", "bot-message");
        botThinking.innerHTML = "Analyzing YouTube video...";
        botThinking.id = "thinking-message";
        document.getElementById("chat-box").appendChild(botThinking);

        // Send to YouTube processing endpoint
        // In your sendMessage() function where you call /process-youtube:
        fetch("/process-youtube", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ url: message })
        })
        .then(response => response.json())
        .then(data => {
        document.getElementById("thinking-message").remove();

        if (data.success) {
            // Successful response with transcript
            displayYouTubeResponse(data);
        } else if (data.message) {
            // No transcript available
            appendMessage(data.message, "bot-message");
        } else {
            // Other errors
            appendMessage(data.error || "Error processing YouTube video", "bot-message");
        }
        })
        .catch(error => {
        document.getElementById("thinking-message").remove();
        console.error("Error processing YouTube video:", error);
        appendMessage("Error processing YouTube video", "bot-message");
        });

        userInput.value = "";
        return;
    }
    // Check for custom responses first
    const customResponse = getCustomResponse(message);
    if (customResponse) {
        appendMessage(customResponse, "bot-message");
        userInput.value = ""; // Clear the input box
        return; // Exit the function after sending the custom response
    }

    // Check for weather requests
    const weatherMatch = message.match(/weather in (.+)/i);
    if (weatherMatch) {
        const city = weatherMatch[1];
        getWeather(city).then(data => {
            if (data.success) {
                appendMessage(data.message, "bot-message");
            } else {
                appendMessage("Sorry, I couldn't fetch the weather.", "bot-message");
            }
        });
        userInput.value = ""; // Clear the input box
        return;
    }

    // Check for news requests
    if (message.toLowerCase().includes("latest news")) {
        getNews().then(data => {
            if (data.success) {
                appendMessage(data.message, "bot-message");
            } else {
                appendMessage("Sorry, I couldn't fetch the news.", "bot-message");
            }
        });
        userInput.value = ""; // Clear the input box
        return;
    }

    // Check for translation requests
    const translationMatch = message.match(/translate (.+) to (\w+)/i);
    if (translationMatch) {
        const textToTranslate = translationMatch[1];
        const targetLanguage = translationMatch[2];

        translateText(textToTranslate, targetLanguage).then(data => {
            if (data.success) {
                appendMessage(data.translated_text, "bot-message");
            } else {
                appendMessage("Sorry, I couldn't translate that.", "bot-message");
            }
        });
        userInput.value = ""; // Clear the input box
        return;
    }

    // Check if the message is an image name (e.g., ends with .png, .jpg, etc.)
    const isImage = /\.(png|jpg|jpeg)$/i.test(message);

    // Check if the message is a file name (e.g., ends with .pdf, .docx, etc.)
    const isFile = /\.(pdf|docx|pptx)$/i.test(message);

    // Display "Bot is thinking..." message
    const botThinking = document.createElement("div");
    botThinking.classList.add("message", "bot-message");
    botThinking.innerHTML = "Bot is thinking...";
    botThinking.id = "thinking-message";
    document.getElementById("chat-box").appendChild(botThinking);

    if (isImage && selectedImageFile) {
        // Handle image upload
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
    } else if (isFile && selectedFile) {
        // Handle file upload
        const formData = new FormData();
        formData.append("file", selectedFile);

        fetch("/upload-file", {
            method: "POST",
            body: formData,
        })
            .then((response) => response.json())
            .then((data) => {
                // Remove the "Bot is thinking..." message
                document.getElementById("thinking-message").remove();

                if (data.success) {
                    // Display the summary generated by Gemini
                    appendMessage(data.summary, "bot-message");
                } else {
                    appendMessage("Failed to process file", "bot-message");
                }
            })
            .catch((error) => {
                // Remove the "Bot is thinking..." message
                document.getElementById("thinking-message").remove();
                console.error("Error uploading file:", error);
            });

        // Clear the input box and reset the selected file
        userInput.value = "";
        selectedFile = null;
    } else {
        // Handle normal text message
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

        // Clear the input box
        userInput.value = "";
    }
}
// Handle file upload
document.getElementById("file-upload").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
        const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
        if (allowedTypes.includes(file.type)) {
            // Display the file name in the input box
            const userInput = document.getElementById("user-input");
            userInput.value = file.name;

            // Store the selected file
            selectedFile = file;
        } else {
            alert("Only PDF, DOCX, and PPTX files are allowed.");
        }
    }
});

// Handle image upload
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

let currentSearchQuery = ""; // Store the current search query

// Function to search the entire chat history
function searchChat() {
    const searchQuery = document.getElementById("search-input").value.trim();
    if (!searchQuery) {
        return; // Exit if no search query is entered
    }

    currentSearchQuery = searchQuery; // Store the search query

    // Fetch all chat history from the server
    fetch('/get_history')
        .then(response => response.json())
        .then(data => {
            if (data.history) {
                let foundMatch = false;

                // Clear previous highlights in the history buttons
                const historyButtons = document.querySelectorAll(".history-button");
                historyButtons.forEach(button => button.classList.remove("highlight-button"));

                // Search through all chat history
                data.history.forEach(chat => {
                    const chatId = chat.chat_id;
                    fetch(`/load_chat_history/${chatId}`)
                        .then(response => response.json())
                        .then(chatData => {
                            if (chatData.chat_history) {
                                let hasMatch = false;

                                // Check if the search term exists in this chat
                                chatData.chat_history.forEach(entry => {
                                    if (entry.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        entry.bot.toLowerCase().includes(searchQuery.toLowerCase())) {
                                        hasMatch = true;
                                    }
                                });

                                // Highlight the history button if a match is found
                                if (hasMatch) {
                                    const historyButton = document.querySelector(`.history-button[data-chat-id="${chatId}"]`);
                                    if (historyButton) {
                                        historyButton.classList.add("highlight-button");
                                        foundMatch = true;
                                    }
                                }
                            }
                        })
                        .catch(error => console.error("Error loading chat history:", error));
                });

                
            }
        })
        .catch(error => console.error('Error fetching history:', error));
}

// Function to highlight the searched word in the chat messages
function highlightSearchQuery() {
    const chatBox = document.getElementById("chat-box");
    const messages = chatBox.querySelectorAll(".text-message");

    messages.forEach(message => {
        const originalHTML = message.innerHTML;
        const highlightedHTML = originalHTML.replace(
            new RegExp(currentSearchQuery, "gi"),
            (match) => `<span class="highlight">${match}</span>`
        );
        message.innerHTML = highlightedHTML;
    });
}

// Function to load chat history when a history button is clicked
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

                // Highlight the searched word in the chat messages
                if (currentSearchQuery) {
                    highlightSearchQuery();
                }
            }
        })
        .catch((error) => console.error("Error loading chat history:", error));
}

// Attach the search function to the search button
document.getElementById("search-button").addEventListener("click", searchChat);

// Enable search on Enter key press
document.getElementById("search-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault(); // Prevent default behavior (e.g., form submission)
        searchChat(); // Trigger search
    }
});

// Update the history button creation to include a data attribute for chat ID
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
                    historyButton.setAttribute("data-chat-id", chat.chat_id); // Add chat ID as data attribute
                    historyButton.onclick = () => loadChatHistory(chat.chat_id); // On click, load history

                    // Insert the new history button at the top
                    historyBox.insertBefore(historyButton, historyBox.firstChild);
                });
            }
        })
        .catch(error => console.error('Error fetching history:', error));
};
// Define custom questions and answers
const customResponses = {
    "what is your name": "I am Mohan's Mini Chatbot, and I am here to help you!",
    "who are you": "I am Mohan's Mini Chatbot, and I am here to help you!",
    "who is your founder": "My boss is Mr. Mohan.",
    "who created you": "My boss is Mr. Mohan.",
    "who is your boss": "My boss is Mr. Mohan.",
    "what can you do": "I can help you with a variety of tasks, such as answering questions, analyzing files, and more!",
    "how are you": "I'm fine thankyou!",
    "what is your purpose": "My purpose is to assist you with your queries and make your life easier.",
};

// Function to check for custom responses
function getCustomResponse(userMessage) {
    const lowerCaseMessage = userMessage.toLowerCase().trim();
    for (const [question, answer] of Object.entries(customResponses)) {
        if (lowerCaseMessage.includes(question)) {
            return answer;
        }
    }
    return null; // Return null if no custom response is found
}

function isYouTubeUrl(message) {
    const patterns = [
        /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=/i,
        /^(https?:\/\/)?(www\.)?youtu\.be\//i,
        /^(https?:\/\/)?(www\.)?youtube\.com\/embed\//i
    ];
    return patterns.some(pattern => pattern.test(message.trim()));
}

function displayYouTubeResponse(data) {
    let message;
    
    if (data.error) {
        message = `Error: ${data.error}`;
    } 
    else if (data.success) {
        // Successful analysis with transcript
        message = data.summary;
    } 
    else {
        // Fallback analysis without transcript
        message = data.message || "Couldn't analyze this video";
    }
    
    // Simple text append without HTML
    appendMessage(message, "bot-message");
}

// Helper functions
function formatDuration(duration) {
    // Convert ISO 8601 duration to HH:MM:SS
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] ? match[1].slice(0, -1) : '0').padStart(2, '0');
    const mins = (match[2] ? match[2].slice(0, -1) : '0').padStart(2, '0');
    const secs = (match[3] ? match[3].slice(0, -1) : '0').padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}