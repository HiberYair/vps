// client.js

const io = require('socket.io-client');

// =======================================================
// === ⚠️ REEMPLAZA ESTOS DATOS CON TUS VALORES REALES ⚠️ ===
// =======================================================
const JWT_ALICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZDZlMGY2NTM3ZTU0OWM3YmFkZDBmZCIsInVzZXJuYW1lIjoiYWxpY2UiLCJpYXQiOjE3NjAxMjEwNjAsImV4cCI6MTc2MDIwNzQ2MH0.od-n7HWkqlx60gLocNuEtxyZItV_b-AfMahoTa__yLE"; 
const ID_ALICE = "68d6e0f6537e549c7badd0fd"; 

const JWT_BOB = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTk1M2RlMTQyOWU0Y2QwNDM3OWFjMSIsInVzZXJuYW1lIjoiYm9iIiwiaWF0IjoxNzYwMTIxODQ0LCJleHAiOjE3NjAyMDgyNDR9.rFRpD4ZZA4ae8b2UCccSH1wiYw87_Vx1Xxum0LcYwwo";
const ID_BOB = "68e953de1429e4cd04379ac1";
// =======================================================


const SERVER_URL = 'http://localhost:3000'; // O el puerto que estés usando

// ------------------------------------
// Cliente Alice
// ------------------------------------
const alice = io(SERVER_URL, {
    auth: {
        token: JWT_ALICE
    }
});

alice.on('connect', () => {
    console.log(`[Alice]: Conectada al servidor (Socket ID: ${alice.id})`);
    
    // Una vez conectada, Alice intentará enviar un mensaje a Bob
    setTimeout(() => {
        alice.emit('send_message', {
            recipientId: ID_BOB, // CRUCIAL: Usar el ID de Bob como destinatario
            text: "Hola Bob, soy Alice. Este es un mensaje privado. ¿Me recibes?"
        });
        console.log(`[Alice]: Mensaje enviado a Bob (${ID_BOB}).`);
    }, 1000); // Espera 1 segundo para asegurar la conexión de Bob
});

alice.on('receive_message', (msg) => {
    // Alice recibe su propio mensaje (confirmación) o una respuesta de Bob
    const tipo = (msg.senderId === ID_ALICE) ? 'CONFIRMACIÓN' : 'MENSAJE DE BOB';
    console.log(`[Alice]: ✉️ RECIBIDO (${tipo}) de ${msg.senderUsername}: "${msg.text}"`);
});

alice.on('connect_error', (err) => {
    console.error(`[Alice] ERROR de Conexión: ${err.message}`);
});


// ------------------------------------
// Cliente Bob
// ------------------------------------
const bob = io(SERVER_URL, {
    auth: {
        token: JWT_BOB
    }
});

bob.on('connect', () => {
    console.log(`[Bob]: Conectado al servidor (Socket ID: ${bob.id})`);
    
    // Bob espera el mensaje de Alice
});

bob.on('receive_message', (msg) => {
    // Bob recibe el mensaje de Alice
    if (msg.senderId === ID_ALICE) {
        console.log(`[Bob]: 📩 RECIBIDO de Alice: "${msg.text}"`);
        
        // Bob responde automáticamente a Alice
        setTimeout(() => {
            bob.emit('send_message', {
                recipientId: ID_ALICE, // CRUCIAL: Usar el ID de Alice como destinatario
                text: "¡Te recibo fuerte y claro, Alice! El chat privado funciona."
            });
            console.log(`[Bob]: Mensaje enviado a Alice (${ID_ALICE}).`);
        }, 1500);
    } else {
        const tipo = (msg.senderId === ID_BOB) ? 'CONFIRMACIÓN' : 'OTRO MENSAJE';
        console.log(`[Bob]: ✉️ RECIBIDO (${tipo}) de ${msg.senderUsername}: "${msg.text}"`);
    }
});

bob.on('connect_error', (err) => {
    console.error(`[Bob] ERROR de Conexión: ${err.message}`);
});