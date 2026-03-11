import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { config } from '../config.js';
import * as fs from 'fs';

// Inicializamos base de datos Firebase
let db: FirebaseFirestore.Firestore | any = null;

try {
    if (fs.existsSync(config.GOOGLE_APPLICATION_CREDENTIALS)) {
        const serviceAccount = JSON.parse(fs.readFileSync(config.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
        const app = initializeApp({
            credential: cert(serviceAccount)
        });
        db = getFirestore(app);
        console.log("✅ Conectado a Firebase Firestore exitosamente.");
    } else {
        console.warn(`⚠️ Archivo de credenciales no encontrado en: ${config.GOOGLE_APPLICATION_CREDENTIALS}. La nube no funcionará hasta agregarlo.`);
    }
} catch (error) {
    console.error("❌ Error inicializando Firebase Firestore:", error);
}

export interface MessageRow {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null;
    tool_calls?: string | null; // Guardado como JSON string
    tool_call_id?: string | null;
}

export const dbFunctions = {
    addMessage: async (userId: number, message: MessageRow) => {
        if (!db) return; // Fallback graceful
        
        try {
            const userRef = db.collection('users').doc(userId.toString());
            const messagesRef = userRef.collection('messages');
            
            await messagesRef.add({
                role: message.role,
                content: message.content || null,
                tool_calls: message.tool_calls || null,
                tool_call_id: message.tool_call_id || null,
                timestamp: FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Error guardando mensaje en Firestore:", error);
        }
    },
    
    getChatHistory: async (userId: number, limit: number = 20): Promise<any[]> => {
        if (!db) return [];
        
        try {
            const userRef = db.collection('users').doc(userId.toString());
            const messagesRef = userRef.collection('messages');
            
            // Obtenemos los mas recientes primero para el limite
            const snapshot = await messagesRef
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
                
            const docs = snapshot.docs.map((doc: any) => doc.data());
            
            // Invertimos porque el LLM los necesita en orden cronologico
            return docs.reverse().map((row: any) => {
                const msg: any = { role: row.role };
                if (row.content !== null) msg.content = row.content;
                if (row.tool_calls !== null) msg.tool_calls = JSON.parse(row.tool_calls);
                if (row.tool_call_id !== null) msg.tool_call_id = row.tool_call_id;
                return msg;
            });
        } catch (error) {
            console.error("Error obteniendo historial de Firestore:", error);
            return [];
        }
    },

    clearHistory: async (userId: number) => {
        if (!db) return;
        
        try {
            const userRef = db.collection('users').doc(userId.toString());
            const messagesRef = userRef.collection('messages');
            
            // Leer todos y borrarlos (En production se haria por batch)
            const snapshot = await messagesRef.get();
            const batch = db.batch();
            
            snapshot.docs.forEach((doc: any) => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log(`[DB] Historial borrado para usuario ${userId}`);
        } catch (error) {
            console.error("Error borrando historial de Firestore:", error);
        }
    }
};

export default db;
