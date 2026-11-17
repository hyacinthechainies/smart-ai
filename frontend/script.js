
// ========================================
// SMART AI - FRONTEND JAVASCRIPT
// ========================================

// 1. CONFIGURATION

const API_BASE_URL = window.location.origin;

const CHAT_API = `${API_BASE_URL}/api/chat`;
const STATUS_API = `${API_BASE_URL}/api/status`;

// 2. GET HTML ELEMENTS

const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const sendButton = document.getElementById("sendButton");
const welcome = document.getElementById("welcome");
const newChatButton = document.getElementById("newChat");
const languageSelect = document.getElementById("languageSelect");
const chatArea = document.getElementById("chatArea");

// Check required elements

if (
    !chatForm ||
    !messageInput ||
    !messages ||
    !sendButton ||
    !welcome ||
    !newChatButton ||
    !chatArea
) {
    console.error("SMART AI: Required HTML elements are missing.");
}

// 3. DISPLAY MESSAGE

function addMessage(text, sender) {

    const message = document.createElement("div");
    message.className = `message ${sender}`;

    const content = document.createElement("div");
    content.className = "message-content";

    content.textContent = text;

    message.appendChild(content);
    messages.appendChild(message);

    chatArea.scrollTop = chatArea.scrollHeight;

    return message;
}

// 4. SEND MESSAGE TO BACKEND

async function sendMessage(text) {

    if (!text || !text.trim()) return;

    const userMessage = text.trim();

    welcome.style.display = "none";

    addMessage(userMessage, "user");

    messageInput.value = "";
    messageInput.style.height = "auto";

    sendButton.disabled = true;
    sendButton.textContent = "Thinking...";

    const loadingMessage = addMessage(
        "SMART AI is thinking...",
        "ai"
    );

    const loadingContent = loadingMessage.querySelector(
        ".message-content"
    );

    try {

        const selectedLanguage = languageSelect
            ? languageSelect.value
            : "English";

        console.log("Sending request to:", CHAT_API);

        const controller = new AbortController();

        const timeoutId = setTimeout(() => {
            controller.abort();
        }, 60000);

        let response;

        try {

            response = await fetch(CHAT_API, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    message: userMessage,
                    language: selectedLanguage

                }),

                signal: controller.signal

            });

        } finally {

            clearTimeout(timeoutId);

        }

        const data = await response.json();

        console.log("SMART AI RESPONSE:", data);

        if (!response.ok) {

            throw new Error(
                data.error || `HTTP Error ${response.status}`
            );

        }

        if (
            !data.answer ||
            typeof data.answer !== "string"
        ) {

            throw new Error(
                "SMART AI returned an invalid response."
            );

        }

        loadingContent.textContent = data.answer;

        console.log("SMART AI response received successfully.");

    } catch (error) {

        console.error("SMART AI CHAT ERROR:", error);

        let errorMessage;

        if (error.name === "AbortError") {

            errorMessage =
                "The request timed out. Please try again.";

        } else if (error instanceof TypeError) {

            errorMessage =
                "Cannot connect to SMART AI backend. Check that the backend is running at http://localhost:3000.";

        } else {

            errorMessage = error.message;

        }

        loadingContent.textContent =
            "Sorry! SMART AI encountered an error: " + errorMessage;

    } finally {

        sendButton.disabled = false;
        sendButton.textContent = "Send";

        messageInput.focus();

        chatArea.scrollTop = chatArea.scrollHeight;

    }

}

// 5. FORM SUBMISSION

if (chatForm) {

    chatForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const text = messageInput.value.trim();

        if (text) {
            sendMessage(text);
        }

    });

}

// 6. SUGGESTED QUESTIONS

document.querySelectorAll(".suggestion").forEach(button => {

    button.addEventListener("click", function() {

        const question = this.dataset.question;

        if (question) {
            sendMessage(question);
        }

    });

});

// 7. NEW CHAT

if (newChatButton) {

    newChatButton.addEventListener("click", function() {

        messages.innerHTML = "";

        welcome.style.display = "block";

        messageInput.value = "";
        messageInput.style.height = "auto";

        messageInput.focus();

    });

}

// 8. AUTO RESIZE TEXTAREA

if (messageInput) {

    messageInput.addEventListener("input", function() {

        this.style.height = "auto";

        this.style.height = this.scrollHeight + "px";

    });

}

// 9. ENTER TO SEND

if (messageInput) {

    messageInput.addEventListener("keydown", function(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.isComposing
        ) {

            event.preventDefault();

            chatForm.requestSubmit();

        }

    });

}

// 10. CHECK BACKEND CONNECTION

async function checkBackend() {

    try {

        const response = await fetch(STATUS_API);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        console.log("SMART AI BACKEND:", data);

        return true;

    } catch (error) {

        console.error(
            "SMART AI BACKEND CONNECTION ERROR:",
            error
        );

        return false;

    }

}

// 11. START SMART AI

checkBackend();

console.log("SMART AI FRONTEND INITIALIZED SUCCESSFULLY.");
