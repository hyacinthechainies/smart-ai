
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

// =====================================
// 1. CONFIGURATION
// =====================================

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const MAX_ATTEMPTS = 3;

// =====================================
// 2. MIDDLEWARE
// =====================================

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Serve frontend
app.use(express.static(
    path.join(__dirname, "../frontend")
));

// =====================================
// 3. GEMINI CONFIGURATION
// =====================================

if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY is missing in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

console.log("Gemini configuration loaded.");

// =====================================
// 4. ERROR STATUS DETECTION
// =====================================

function getErrorStatus(error) {

    const status = Number(
        error?.status ||
        error?.statusCode ||
        error?.code ||
        error?.response?.status
    );

    if (status >= 400 && status <= 599) {
        return status;
    }

    const message = String(error?.message || "");

    const match = message.match(
        /"code"\s*:\s*(\d{3})/
    );

    if (match) {
        return Number(match[1]);
    }

    if (message.includes("UNAVAILABLE")) return 503;
    if (message.includes("RESOURCE_EXHAUSTED")) return 429;
    if (message.includes("UNAUTHENTICATED")) return 401;

    return 500;
}

// =====================================
// 5. AUTOMATIC RETRY SYSTEM
// =====================================

async function generateWithRetry(request) {

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

        try {

            console.log(
                `Gemini request: Attempt ${attempt}/${MAX_ATTEMPTS}`
            );

            const response = await ai.models.generateContent(request);

            return response;

        } catch (error) {

            const status = getErrorStatus(error);

            const retryableErrors = [
                429,
                500,
                502,
                503,
                504
            ];

            const shouldRetry = retryableErrors.includes(status);

            console.error(
                `Gemini attempt ${attempt} failed. Status: ${status}`
            );

            if (!shouldRetry || attempt === MAX_ATTEMPTS) {
                throw error;
            }

            const delay = 1500 * Math.pow(2, attempt - 1);

            console.log(
                `Retrying in ${delay / 1000} seconds...`
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error("Gemini request failed after all attempts.");
}

// =====================================
// 6. BACKEND STATUS
// =====================================

app.get("/api/status", (req, res) => {

    res.status(200).json({

        success: true,
        application: "SMART AI",
        provider: "Google Gemini",
        model: MODEL,
        status: "online",
        message: "SMART AI Gemini backend is running!"

    });

});

// =====================================
// 7. AI CHAT ENDPOINT
// =====================================

app.post("/api/chat", async (req, res) => {

    try {

        const {
            message,
            language = "English"
        } = req.body || {};

        // Validate message

        if (
            typeof message !== "string" ||
            !message.trim()
        ) {

            return res.status(400).json({

                success: false,
                error: "Please enter a valid message."

            });

        }

        // Supported languages

        const supportedLanguages = [
            "English",
            "Kinyarwanda",
            "French"
        ];

        const selectedLanguage =
            supportedLanguages.includes(language)
                ? language
                : "English";

        console.log("--------------------------------");
        console.log("NEW SMART AI MESSAGE");
        console.log("Message:", message);
        console.log("Language:", selectedLanguage);
        console.log("Provider: Google Gemini");
        console.log("Model:", MODEL);
        console.log("--------------------------------");

        // System instructions

        const instructions = `
You are SMART AI, an intelligent and helpful
multilingual AI assistant.

LANGUAGE RULES:

1. Always answer in ${selectedLanguage}.
2. Support English, Kinyarwanda and French.
3. Use simple and understandable language.
4. Give detailed explanations when necessary.
5. Help users with programming, education,
   technology, research and general questions.
6. Never invent facts or sources.
7. If uncertain, explain clearly.
8. Be friendly, professional and respectful.
9. Answer the user's actual question.

Your name is SMART AI.
`;

        // Generate response with retry

        const response = await generateWithRetry({

            model: MODEL,

            contents: message.trim(),

            config: {

                systemInstruction: instructions,
                temperature: 0.7,
                maxOutputTokens: 2048

            }

        });

        // Extract answer

        const answer = response.text;

        if (
            typeof answer !== "string" ||
            !answer.trim()
        ) {

            console.error("Gemini returned an empty response.");

            return res.status(502).json({

                success: false,
                error: "Gemini returned an empty response."

            });

        }

        console.log("SMART AI response generated successfully.");

        // Send response

        return res.status(200).json({

            success: true,
            answer: answer,
            provider: "Google Gemini",
            model: MODEL

        });

    } catch (error) {

        const statusCode = getErrorStatus(error);

        console.error(
            "GEMINI ERROR:",
            statusCode,
            error.message
        );

        let userMessage;

        if (statusCode === 503) {

            userMessage =
                "Google Gemini is temporarily busy. Please try again shortly.";

        } else if (statusCode === 429) {

            userMessage =
                "Gemini request limit reached. Please try again later.";

        } else if (statusCode === 401 || statusCode === 403) {

            userMessage =
                "Gemini API authentication failed. Please check your API key.";

        } else {

            userMessage =
                "SMART AI could not process your request. Please try again.";

        }

        return res.status(statusCode).json({

            success: false,
            error: userMessage,
            code: statusCode

        });

    }

});

// =====================================
// 8. INVALID API ROUTE
// =====================================

app.use("/api", (req, res) => {

    res.status(404).json({

        success: false,
        error: "API endpoint not found."

    });

});

// =====================================
// 9. GENERAL ERROR HANDLER
// =====================================

app.use((error, req, res, next) => {

    console.error("SERVER ERROR:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({

        success: false,
        error: "Internal server error."

    });

});

// =====================================
// 10. START SERVER
// =====================================

app.listen(PORT, () => {

    console.log("");
    console.log("================================");
    console.log("          SMART AI");
    console.log("================================");

    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Status: http://localhost:${PORT}/api/status`);
    console.log(`Chat: http://localhost:${PORT}/api/chat`);

    console.log("Provider: Google Gemini");
    console.log(`Model: ${MODEL}`);
    console.log("Status: ONLINE");

    console.log("================================");
    console.log("");

});
