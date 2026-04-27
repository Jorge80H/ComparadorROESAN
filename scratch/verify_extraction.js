import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: './v2/.env' });

// Get the prompt directly from the file to handle updates automatically
const procesarPdfPath = 'c:/Users/lu_br/Downloads/ROESAN_COMPARADOR_V1/v2/netlify/functions/procesar-pdf.js';
const procesarPdfContent = fs.readFileSync(procesarPdfPath, 'utf8');
const promptMatch = procesarPdfContent.match(/const EXTRACTION_PROMPT = `([\s\S]*?)`;/);
const EXTRACTION_PROMPT = promptMatch ? promptMatch[1] : '';

async function testExtraction(filePath) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY NOT FOUND");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash as it is more widely available
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });

    const pdfData = fs.readFileSync(filePath);
    const pdfBase64 = pdfData.toString('base64');

    console.log(`\n--- Processing file: ${path.basename(filePath)} ---`);

    try {
        const result = await model.generateContent([
            EXTRACTION_PROMPT + `\nNombre del archivo: ${path.basename(filePath)}`,
            {
                inlineData: {
                    data: pdfBase64,
                    mimeType: "application/pdf"
                }
            }
        ]);

        const text = result.response.text();
        console.log("Response JSON:");
        console.log(text);
        
        const data = JSON.parse(text);
        const c = Array.isArray(data) ? data[0] : data;
        
        console.log("\nSummary of Key Fields:");
        console.log(`Aseguradora: ${c.aseguradora}`);
        console.log(`Prima Neta: ${c.prima_neta}`);
        console.log(`Asistencia: ${c.valor_asistencia}`);
        console.log(`IVA: ${c.iva}`);
        console.log(`IVA Asistencia: ${c.iva_asistencia}`);
        console.log(`TOTAL: ${c.prima_total}`);
        
    } catch (error) {
        console.error("Error during extraction:", error);
    }
}

async function run() {
    const files = [
        'c:/Users/lu_br/Downloads/ROESAN_COMPARADOR_V1/DOCUMENTOS_EJEMPLO/ejemplo01/RENOVACION BOLIVAR IXN999 MANUEL ANTONIO ORTIZ.pdf',
        'c:/Users/lu_br/Downloads/ROESAN_COMPARADOR_V1/DOCUMENTOS_EJEMPLO/ejemplo01/COTIZACION AXA IXN999 MANUEL ANTONIO ORTIZ.pdf'
    ];

    for (const file of files) {
        if (fs.existsSync(file)) {
            await testExtraction(file);
        } else {
            console.warn(`File not found: ${file}`);
        }
    }
}

run();
