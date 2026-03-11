import { getCompletion } from "./llm.js";
import { tools, executeTool } from "./tools.js";
import { dbFunctions } from "../db/index.js";

const MAX_ITERATIONS = 5;

const SYSTEM_PROMPT = `Eres Stephanie IA, un agente de IA personal creado desde cero, altamente eficiente y segura.
Te comunicas con Naomi y cuentas con una integración con su sistema local a través de herramientas y Telegram.
MANDATORIO: SIEMPRE debes comunicarte, hablar y escribir EXCLUSIVAMENTE en español.
Siéntete libre de expresarte de forma amigable, inteligente y directa. Siempre procesa y usa las herramientas a tu alcance cuando algo requiere información de fuera, como la fecha de hoy, la zona horaria, etc. Siéntete como la mano derecha de Naomi.`;

export async function processAgentLoop(userId: number, userMessage: string): Promise<string> {
    // 1. Añadir mensaje de usuario a la BD
    await dbFunctions.addMessage(userId, { role: "user", content: userMessage });
    
    // 2. Extraer historial y prepararlo
    const messages = await dbFunctions.getChatHistory(userId, 30); // Usamos las últimas 30 iteraciones de la conversacion

    // Nos aseguramos de mantener nuestro context con system en primer lugar
    messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    
    let iterations = 0;
    
    // El Agente en loop
    while (iterations < MAX_ITERATIONS) {
        iterations++;
        console.log(`[Agent] Iteración interior... (${iterations}/${MAX_ITERATIONS})`);
        
        try {
            // Pasamos nuestra lista de mensajes temporal al LLM
            const message = await getCompletion(messages, tools);
            
            // Adjuntamos la respuesta de asistente a nuestro historial temporal para la siguiente iteración
            messages.push(message);
            
            // Lo guardamos igual en la BD para persistencia
            await dbFunctions.addMessage(userId, {
                role: message.role || "assistant",
                content: message.content || null,
                tool_calls: message.tool_calls ? JSON.stringify(message.tool_calls) : null,
            });

            // Si hay peticiones de ejecutar tool, el LLM nos está pidiendo usar herramientas
            if (message.tool_calls && message.tool_calls.length > 0) {
                console.log(`[Agent] Se pidieron herramientas, ejecutando...`);
                
                for (const toolCall of message.tool_calls) {
                    if (toolCall.type === "function") {
                        const name = toolCall.function.name;
                        let args = {};
                        try {
                            args = JSON.parse(toolCall.function.arguments);
                        } catch (e) {
                            console.error("Error parseando argumentos del LLM:", e);
                        }
                        
                        try {
                            // Run the tool execution 
                            const result = await executeTool(name, args);
                            
                            const toolMessage = {
                                role: "tool" as const,
                                tool_call_id: toolCall.id,
                                content: JSON.stringify(result)
                            };
                            
                            messages.push(toolMessage);
                            await dbFunctions.addMessage(userId, toolMessage);
                            
                        } catch (error: any) {
                            const errorMessage = {
                                role: "tool" as const,
                                tool_call_id: toolCall.id,
                                content: JSON.stringify({ error: error.message || String(error) })
                            };
                            
                            messages.push(errorMessage);
                            await dbFunctions.addMessage(userId, errorMessage);
                        }
                    }
                }
                // Continua el loop. Se llamará nuevamente a \`getCompletion\` con estos nuevos mensajes \`tool\` incluidos
            } else {
                // No hay llamadas a herramientas, hemos terminado con una respuesta normal para el usuario
                return message.content || "(No se generó texto content, posible fallo procesal)";
            }

        } catch (error: any) {
            console.error("[Agent Error]", error);
            return `Ocurrió un error al procesar la respuesta: ${error.message}`;
        }
    }
    
    return "Cuidado: He realizado demasiados pasos seguidos para cumplir con la acción. Limité la ejecución por seguridad y para no consumir tokens. Sé más específica en tu pregunta o intenta algo más simple.";
}

export async function clearAgentMemory(userId: number) {
    await dbFunctions.clearHistory(userId);
}
