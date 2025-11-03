const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// =======================================================
// === ⚠️ CONFIGURACIÓN DE CIFRADO DEL SERVIDOR ⚠️ ===
// =======================================================
// ¡IMPORTANTE! Este valor DEBE ser el mismo que tu clave maestra (ENCRYPTION_KEY) del .env
const ENCRYPTION_KEY_SERVER = "27ee9a522d573bebd85b6c260cd0806eb05b139f82638e36efbc3520c670c544"; 
const algorithm = 'aes-256-cbc';

// ----------------------------------------------------
// -- VERIFICACIÓN DE CLAVE --
// ----------------------------------------------------
if (ENCRYPTION_KEY_SERVER.length !== 64) {
    console.error("❌ ERROR CRÍTICO: La clave maestra debe ser una cadena hexadecimal de 64 caracteres (32 bytes).");
    process.exit(1);
}

try {
    const key = Buffer.from(ENCRYPTION_KEY_SERVER, 'hex'); // Clave maestra del servidor (Buffer de 32 bytes)
    const iv = Buffer.alloc(16, 0); // Vector de inicialización estático (Buffer de 16 bytes de ceros)
} catch (e) {
    console.error(`❌ ERROR CRÍTICO: No se pudo crear el Buffer de la clave. ${e.message}`);
    process.exit(1);
}
// ----------------------------------------------------

function decryptFile(encryptedFilePath, outputFileName) {
    // 1. Preguntar al usuario por la clave de descifrado (la que llegó por correo)
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('\nIngrese la clave de descifrado (del correo): ', (decryptionKey) => {
        readline.close();
        
        try {
            // Nota importante: En esta implementación, la 'decryptionKey' ingresada por el usuario NO se usa
            // en el proceso de descifrado (solo se usa la clave maestra hardcodeada).
            // Se asume que la clave de correo es solo un control de autorización externo,
            // ya que el descifrado real requiere la clave maestra del servidor.

            console.log(`\nIniciando descifrado del archivo: ${encryptedFilePath}...`);

            // 2. Crear las streams (flujos) de lectura y escritura
            const inputFile = path.resolve(encryptedFilePath);
            const outputFile = path.resolve(outputFileName);

            if (!fs.existsSync(inputFile)) {
                throw new Error(`Archivo no encontrado: ${inputFile}`);
            }

            const readStream = fs.createReadStream(inputFile);
            const writeStream = fs.createWriteStream(outputFile);

            // 3. Crear el descifrador
            // Usamos las constantes definidas globalmente
            const key = Buffer.from(ENCRYPTION_KEY_SERVER, 'hex');
            const iv = Buffer.alloc(16, 0);
            const decipher = crypto.createDecipheriv(algorithm, key, iv);

            // 4. Conectar los flujos: Leer -> Descifrar -> Escribir
            readStream.pipe(decipher).pipe(writeStream);

            writeStream.on('finish', () => {
                console.log(`\n✅ ¡Descifrado completo! Archivo guardado como: ${outputFileName}`);
                console.log(`Ahora puedes abrir ${outputFile} con tu software habitual.`);
                
                // Opcional: Borrar el archivo cifrado descargado
                try {
                    fs.unlinkSync(inputFile);
                    console.log(`\n🧹 Archivo cifrado ${encryptedFilePath} borrado localmente.`);
                } catch (e) {
                    console.warn(`Advertencia: No se pudo borrar el archivo cifrado. ${e.message}`);
                }
            });

            writeStream.on('error', (err) => {
                console.error(`❌ Error de escritura al descifrar: ${err.message}`);
                // Si hay un error, intentamos borrar el archivo parcialmente escrito
                if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
            });
            
            readStream.on('error', (err) => {
                console.error(`❌ Error de lectura del archivo cifrado: ${err.message}`);
            });
            
            decipher.on('error', (err) => {
                // Este error suele indicar una clave incorrecta o padding inválido (corrupción de datos).
                console.error(`❌ ERROR de Descifrado (Clave/Integridad): La clave o el archivo son incorrectos. Verifique la clave maestra en el script: ${err.message}`);
                 // Detener streams y limpiar si es posible
                readStream.unpipe(decipher);
                decipher.unpipe(writeStream);
                writeStream.end();
                // Si hay un error de descifrado, borramos el archivo de salida
                if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
            });


        } catch (error) {
            console.error(`❌ Error general en el proceso de descifrado: ${error.message}`);
        }
    });
}

// ------------------------------------------------------------------
// Llama a la función de descifrado al inicio del script
// ------------------------------------------------------------------
const encryptedFile = process.argv[2]; 
const originalFileName = process.argv[3] || (encryptedFile ? encryptedFile.replace(/\.enc$/, '') : null); 

if (!encryptedFile) {
    console.error('Uso: node decrypt_client.js <archivo_descargado.enc> [nombre_original_del_archivo]');
    console.error('Ejemplo: node decrypt_client.js archivo_secreto.pdf.enc archivo_secreto.pdf');
    process.exit(1);
}

decryptFile(encryptedFile, originalFileName);