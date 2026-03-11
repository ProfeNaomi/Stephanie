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
        default:
            throw new Error(`Tool ${name} no encontrada o no soportada.`);
    }
}
