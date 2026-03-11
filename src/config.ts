import dotenv from 'dotenv';

dotenv.config();

export const config = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_ALLOWED_USER_IDS: process.env.TELEGRAM_ALLOWED_USER_IDS 
        ? process.env.TELEGRAM_ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim(), 10))
        : [],
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openrouter/free',
    DB_PATH: process.env.DB_PATH || './memory.db',
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json',
};

// Validación de credenciales vitales y whitelist
if (!config.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN === 'SUTITUYE POR EL TUYO') {
    console.warn("⚠️ Advertencia: No has configurado TELEGRAM_BOT_TOKEN en el .env");
}

if (config.TELEGRAM_ALLOWED_USER_IDS.length === 0 || isNaN(config.TELEGRAM_ALLOWED_USER_IDS[0])) {
    console.warn("⚠️ Advertencia: No has configurado TELEGRAM_ALLOWED_USER_IDS de forma válida en el .env");
}
