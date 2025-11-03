// test_socket.js

const io = require('socket.io-client');

// 1. PEGA AQUÍ TU TOKEN JWT VÁLIDO:
const VALID_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZDZlMGY2NTM3ZTU0OWM3YmFkZDBmZCIsInVzZXJuYW1lIjoiYWxpY2UiLCJpYXQiOjE3NTg5MTI3NTgsImV4cCI6MTc1ODk5OTE1OH0.FggtSYZrLEwztIH_FDdPEYixmJnKqe4_xXl9ZOfhFpk"; 

// 2. Conectarse, enviando el token en el objeto 'auth'
const socket = io('http://localhost:3000', {
    auth: {
        token: VALID_TOKEN
    }
});

socket.on('connect', () => {
    console.log('Conexión Socket.IO Exitosa. ¡Estás dentro!');

    // 3. Envía un mensaje de prueba
    socket.emit('send_message', { 
        text: 'Hola desde el cliente autenticado!',
        recipient: 'otro_usuario_id' // Aún no lo usamos, pero lo preparamos
    });
});

socket.on('connect_error', (err) => {
    console.error('ERROR de Conexión:', err.message);
});

socket.on('receive_message', (data) => {
    console.log('Mensaje recibido:', data);
});