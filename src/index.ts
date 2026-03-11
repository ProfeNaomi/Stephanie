import { Bot } from "grammy";
import * as http from "http";
import { config } from "./config.js";
import { processAgentLoop, clearAgentMemory } from "./agent/loop.js";

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

// Detectar texto regular
bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    await ctx.replyWithChatAction("typing");

    try {
        const response = await processAgentLoop(userId, text);
        
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
