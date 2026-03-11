import { Bot, InputFile } from "grammy";
import * as http from "http";
import * as fs from "fs";
import { config } from "./config.js";
import { processAgentLoop, clearAgentMemory } from "./agent/loop.js";
import { transcribeAudio, generateTTS } from "./agent/audio.js";

// Inicializar el bot con el Token
const bot = new Bot(config.TELEGRAM_BOT_TOKEN || 'DUMMY');

// Middleware 1: Firewall para limitar acceso exclusivo (WHITELIST)
bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (!config.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
        console.warn(`[Seguridad] Bloqueado mensaje de un usuario no autorizado: ${userId}`);
        return;
    }
    await next();
});

// Comandos
bot.command("start", async (ctx) => {
    await ctx.reply("¡Hola! Soy Stephanie IA, tu agente personal. Todo el sistema está online y listo para ejecutarse de forma segura. Envíame un mensaje o usa /clear para reiniciar mi memoria temporal.");
});

bot.command("clear", async (ctx) => {
    const userId = ctx.from!.id;
    await clearAgentMemory(userId);
    await ctx.reply("Memoria reseteada exitosamente. Estamos como nuevos.");
});

// Detectar audios y notas de voz
bot.on(["message:voice", "message:audio"], async (ctx) => {
    const userId = ctx.from.id;
    
    await ctx.replyWithChatAction("record_voice"); // Mostramos audífono/micrófono arriba mientras trabajamos

    try {
        const file = await ctx.getFile();
        const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        
        // 1. STT: Transcribir el audio a texto
        const textFromAudio = await transcribeAudio(fileUrl);
        await ctx.reply(`🎤 _Escuchado:_ "${textFromAudio}"`, { parse_mode: "Markdown" }); // Opcional, pero da buen feedback
        
        await ctx.replyWithChatAction("typing");
        
        // 2. Cerebro LLC - Extraer la respuesta general del bot con herraminetas y memoria
        const responseText = await processAgentLoop(userId, textFromAudio);
        
        await ctx.replyWithChatAction("record_voice");

        // 3. TTS: Convertimos el texto final en voz usando ElevenLabs
        const audioPath = await generateTTS(responseText);
        
        if (audioPath) {
            // Mandamos el audio con Grammy usando un InputFile local
            await ctx.replyWithVoice(new InputFile(audioPath));
            
            // Enviamos el texto también, por si el usuario no puede escuchar ahora, en chunks si es largo
            if (responseText.length > 4000) {
                for (let i = 0; i < responseText.length; i += 4000) {
                    await ctx.reply(responseText.slice(i, i + 4000));
                }
            } else {
                await ctx.reply(responseText);
            }
            
            // Borramos el audio local porque ya se terminó de enviar
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        } else {
            // Fallback (o no hay api key): Solo devolvemos texto
            if (responseText.length > 4000) {
                for (let i = 0; i < responseText.length; i += 4000) {
                    await ctx.reply(responseText.slice(i, i + 4000));
                }
            } else {
                await ctx.reply(responseText);
            }
        }

    } catch (error) {
        console.error("Error proceso de voz:", error);
        await ctx.reply("Lo siento, no pude procesar tu mensaje de voz correctamente. Intenta de nuevo.");
    }
});

// Detectar texto regular
bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    await ctx.replyWithChatAction("typing");

    try {
        const response = await processAgentLoop(userId, text);
        
        // Si nos envió texto, solo le respondemos con texto. (Podrías modificar esto para mandar audio también)
        if (response.length > 4000) {
            for (let i = 0; i < response.length; i += 4000) {
                await ctx.reply(response.slice(i, i + 4000));
            }
        } else {
            await ctx.reply(response);
        }
    } catch (error) {
        console.error("Error processing message:", error);
        await ctx.reply("Ups, encontré un error interno de ejecución en mi script principal. Revisa mi consola local.");
    }
});

// Start bot
bot.start({
    onStart: (botInfo) => {
        console.log(`[Servidor Iniciado] Conectado exitosamente en Telegram como @${botInfo.username}`);
        console.log(`[Seguridad] Whitelist activada para los IDs: ${config.TELEGRAM_ALLOWED_USER_IDS.join(", ")}`);
        console.log(`===============================================`);
    }
});

// Error handling global
bot.catch((err) => {
    console.error(`[Fatal] Excepción de Grammy arrojada:\n`, err);
});

// --- DUMMY WEB SERVER PARA RENDER.COM ---
// Render requiere que expongamos un puerto web para no matar el proceso gratuito.
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Stephanie IA Bot is running here.\n');
});

server.listen(port, () => {
    console.log(`[Render Web Service] Servidor web fantasma escuchando en el puerto ${port}`);
});
