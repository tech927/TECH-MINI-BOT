const express = require('express');
const path = require('path');
const bodyParser = require("body-parser");
const app = express();
const PORT = process.env.PORT || 8000;

// Import du module pair.js
const code = require('./pair'); 

// Augmenter le nombre max d'écouteurs pour éviter les warnings
require('events').EventEmitter.defaultMaxListeners = 500;

// Middleware pour parser le corps des requêtes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route pour le module pair
app.use('/code', code);

// Servir pair.html
app.get('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
});

// Servir main.html depuis le dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Fallback pour la racine
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

app.listen(PORT, () => {
    console.log(`
Don't Forget To Give Star ‼️

Server running on http://localhost:${PORT}`);
});

module.exports = app;
