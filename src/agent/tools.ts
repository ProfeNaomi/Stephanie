import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: Record<string, any>;
    }
}

export const tools: ToolDefinition[] = [
    {
        type: "function",
        function: {
            name: "get_current_time",
            description: "Obtiene la hora actual del sistema. Útil para decirle al usuario qué hora es, qué día es, etc.",
            parameters: {
                type: "object",
                properties: {
                    timezone: {
                        type: "string",
                        description: "Opcional. Zona horaria de IANA, ej. 'Europe/Madrid' o 'America/Argentina/Buenos_Aires'. Por defecto usa la local."
                    }
                },
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "execute_google_workspace_command",
            description: "Interactúa con las herramientas de Google Workspace de Naomi (Gmail, Calendar, Drive, Docs) mediante la herramienta CLI 'gog'. Útil para leer correos, enviar emails, agendar y leer calendarios. Devuelve salida JSON si la solicitas.",
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "El comando de 'gog' a ejecutar. Ej: 'gog gmail search \"is:unread\" --max 5 --json'. El comando siempre debe empezar con 'gog'."
                    }
                },
                required: ["command"],
                additionalProperties: false
            }
        }
    }
];

export async function executeTool(name: string, args: any): Promise<any> {
    switch (name) {
        case "get_current_time":
            let timeOpts: Intl.DateTimeFormatOptions = { 
                dateStyle: 'full', 
                timeStyle: 'long' 
            };
            if (args.timezone) {
                timeOpts.timeZone = args.timezone;
            }
            return {
                time: new Date().toLocaleString('es-ES', timeOpts)
            };
        case "execute_google_workspace_command":
            if (!args.command || typeof args.command !== 'string') {
                return { error: "El comando debe ser un string válido." };
            }
            if (!args.command.trim().startsWith("gog ")) {
                return { error: "Prohibido: Solo se permite ejecutar con el binario 'gog'." };
            }
            try {
                const { stdout, stderr } = await execAsync(args.command);
                if (stderr && stderr.trim() !== '') {
                    console.warn(`[GOG CLI WARNING] ${stderr}`);
                }
                return { output: stdout || stderr };
            } catch (error: any) {
                return { error: error.message };
            }
        default:
            throw new Error(`Tool ${name} no encontrada o no soportada.`);
    }
}
