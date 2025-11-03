// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true }, 
    password: { 
        type: String, 
        required: true 
    },
});

// PRE-SAVE HOOK: Hashear la contraseña antes de guardarla
UserSchema.pre('save', async function(next) {
    // Solo hashear si la contraseña ha sido modificada
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10); // Genera un "salt" con 10 rondas
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Método para comparar contraseñas (para el login)
UserSchema.methods.isValidPassword = async function(password) {
    const compare = await bcrypt.compare(password, this.password);
    return compare;
}

module.exports = mongoose.model('User', UserSchema);