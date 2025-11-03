// models/Message.js

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500 
    },
}, { 
    // CRUCIAL: Añade createdAt/updatedAt que usaremos como timestamp
    timestamps: true 
});

MessageSchema.index({ sender: 1, recipient: 1 });

module.exports = mongoose.model('Message', MessageSchema);