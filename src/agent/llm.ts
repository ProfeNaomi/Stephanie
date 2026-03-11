import OpenAI from "openai";
import { config } from "../config.js";

// Inicializamos clientes usando la interfaz compatible de OpenAI
export const groqClient = new OpenAI({
    apiKey: config.GROQ_API_KEY || 'dummy_key', // Prevenir crashes por falta de SDK variables y controlarlo antes
    baseURL: "https://api.groq.com/openai/v1"
});

const openRouterClient = new OpenAI({
    apiKey: config.OPENROUTER_API_KEY || 'dummy_key',
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": "https://github.com/NaomiStephanie/Stephanie-IA", // Mandatory for OpenRouter
        "X-Title": "Stephanie IA Local", 
    }
});

export async function getCompletion(messages: any[], tools?: any[]): Promise<any> {
    try {
        if (!config.GROQ_API_KEY || config.GROQ_API_KEY.includes("SUTITUYE")) {
            throw new Error("No hay GROQ_API_KEY válida configurada");
        }
        
        // Intentar con Groq
        const response = await groqClient.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages,
            tools: tools?.length ? tools : undefined,
            tool_choice: tools?.length ? "auto" : undefined,
            temperature: 0.7,
            max_tokens: 2048,
        });
        return response.choices[0].message;
    } catch (error: any) {
        console.error("⚠️ Error en Groq (" + error.message + "), intentando OpenRouter fallback...");
        
        if (!config.OPENROUTER_API_KEY || config.OPENROUTER_API_KEY.includes("SUTITUYE")) {
            throw new Error("Tampoco hay fallback disponible de OpenRouter configurado.");
        }

        // Fallback OpenRouter
        const response = await openRouterClient.chat.completions.create({
            model: config.OPENROUTER_MODEL,
            messages,
            tools: tools?.length ? tools : undefined,
            tool_choice: tools?.length ? "auto" : undefined,
            temperature: 0.7,
            max_tokens: 2048,
        });
        return response.choices[0].message;
    }
}
