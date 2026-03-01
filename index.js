const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config(); // Esto lee tu archivo .env
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Guardamos la imagen en memoria temporal (RAM)
const upload = multer({ storage: multer.memoryStorage() });

// Inicializamos el SDK de Gemini con tu clave secreta
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Fisimat API funcionando al 100%' });
});

// Ruta principal asíncrona (async) porque Gemini tarda unos segundos en pensar
app.post('/api/solve', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Debes enviar una imagen del problema.' });
    }

    console.log('🖼️ Imagen recibida. Enviando a Gemini para OCR y resolución...');

    // 1. Preparamos la imagen para Gemini (la convertimos de Buffer a Base64)
    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype,
      },
    };

    // 2. El Prompt Arquitectónico (Tu especialidad)
    const prompt = `Eres un tutor experto en física y matemáticas para la plataforma Fisimat. 
    Analiza la imagen adjunta que contiene un problema educativo.
    
    RESTRICCIONES:
    - Resuelve el problema paso a paso.
    - Tu respuesta DEBE ser EXCLUSIVAMENTE un objeto JSON válido.
    - No incluyas texto fuera del JSON, ni bloques de código markdown (\`\`\`json).
    
    ESTRUCTURA JSON REQUERIDA:
    {
      "tema_identificado": "Ej. Cinemática, Circuitos, etc.",
      "datos_extraidos": ["dato 1", "dato 2"],
      "pasos_de_solucion": ["Paso 1: ...", "Paso 2: ..."],
      "resultado_final": "..."
    }`;

    // 3. Llamamos al modelo (Usamos la versión 2.5 flash, igual que TITAN Security)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // 4. Ejecutamos la petición
    const result = await model.generateContent([prompt, imagePart]);
    let responseText = result.response.text();

    // Limpiamos la respuesta por si Gemini le puso comillas de markdown por error
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    // 5. Convertimos el texto a un objeto JSON real en JavaScript
    const jsonRespuesta = JSON.parse(responseText);

    console.log('✅ Problema resuelto con éxito.');

    // 6. Devolvemos la respuesta al cliente
    res.status(200).json({
      exito: true,
      solucion: jsonRespuesta
    });

  } catch (error) {
    console.error('❌ Error en el servidor o en Gemini:', error);
    res.status(500).json({ error: 'Hubo un error al procesar el problema de física.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Fisimat AI Tutor corriendo en http://localhost:${PORT}`);
});