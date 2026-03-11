# Stephanie IA LocaL

Stephanie IA es un agente personal creado desde cero, implementado de forma segura y completamente con arquitecturas de ejecución local.

## Características Fundamentales

- ✨ **Hecho en TypeScript** usando módulos ECMAScript (ESM),
- 📱 **Telegram como Interfaz Central** (con `grammy` usando long-polling; sin usar webhooks o servidores web de por medio, para que funcione bajo NAT o en local sin problemas),
- 🧠 **Basado en Groq LLaMA** (y fallback a OpenRouter si hay problemas con Groq),
- 🔄 **Autonomous Agent Loop**: El agente puede auto-iterar hasta 5 veces para usar componentes y usar dependencias antes de entregar la respuesta (ReAct patterns),
- 🛠️ **Acceso a Herramientas**: Módulo de tools y JSON scheme definitions incluidas (`get_current_time` operando en este momento),
- 💾 **Memoria Persistente**: Funciona a través de un simple fichero SQLite3 sin levantar un motor SQL server (manteniendo registro de contexto previo).
- 🛡️ **Seguridad primero**: Sin posibilidad de ejecución local desautorizada o skills/prompts desconocidas. Whitelist de Telegeram incluida.

## Modo de Uso y Desarrollo

### 1. Variables de Entorno
Crea o simplemente rellena el archivo existente `.env` con lo siguiente:

```bash
TELEGRAM_BOT_TOKEN="SUTITUYE POR EL TUYO"
TELEGRAM_ALLOWED_USER_IDS="1234567, 7654321" # Cambia por tu ID
GROQ_API_KEY="SUTITUYE POR EL TUYO"
OPENROUTER_API_KEY="SUTITUYE POR EL TUYO"
OPENROUTER_MODEL="openrouter/free"
DB_PATH="./memory.db"
GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"
```

### 2. Levantar el proyecto

Solo requiere Node 20+:

```bash
npm install
npm run dev
```

El script de `dev` usa `tsx watch src/index.ts` lo cual significa que se recargará automáticamente al realizar cualquier ajuste o refactor en caliente.

## Expansión del agente
La arquitectura es completamente modular:
- Si quieres integrar **ElevenLabs** o **Google TTS**: basta con integrarlo en nuevas Tools (revisa `src/agent/tools.ts`) , pedirle que genere buffers y usar `grammy` para enviar el `sendAudio` usando `ctx` cuando el tool termine o pasando el wrapper de telegram.
- Para integración global (deploy cloud firestore/supabase): Solo modifica el archivo expuesto en la capa `src/db/index.ts`. La base del código quedará inmutable.
