import { groqClient } from "./llm.js";
import { config } from "../config.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export async function transcribeAudio(fileUrl: string): Promise<string> {
    const tempFilePath = path.join(os.tmpdir(), `input_${Date.now()}.ogg`);
    
    // 1. Descargamos el archivo OGG desde Telegram
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error("No se pudo descargar el archivo de audio de Telegram.");
    }
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));
    
    // 2. Transcribimos usando Groq Whisper (es el mejor modelo Open Source en rapidez)
    const transcription = await groqClient.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-large-v3",
        language: "es", // Forzamos Español para evitar alucinaciones
        response_format: "json",
    });
    
    // 3. Limpieza del archivo temporal local
    if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
    }
    
    return transcription.text;
}

export async function generateTTS(text: string): Promise<string | null> {
    // Si el usuario no tiene llave de ElevenLabs o dejó la por defecto, abortamos y usaremos texto
    if (!config.ELEVENLABS_API_KEY || config.ELEVENLABS_API_KEY.includes("SUTITUYE")) {
        console.warn("⚠️ No hay API KEY de ElevenLabs configurada en el servidor. Respondiendo sólo con texto.");
        return null;
    }

    const tempFilePath = path.join(os.tmpdir(), `output_${Date.now()}.mp3`);
    
    const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Voz por defecto de ElevenLabs (Bella) o puedes cambiarla por cualquiera de su librería.
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': config.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2", // Versión 2 funciona brutal en Español
        })
    });
    
    if (!response.ok) {
         console.error("❌ Error consumiendo ElevenLabs API:", await response.text());
         return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));
    
    return tempFilePath;
}
