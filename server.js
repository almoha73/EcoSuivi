const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Charger .env manuellement pour éviter d'installer dotenv
if (fs.existsSync('.env')) {
    const env = fs.readFileSync('.env', 'utf8');
    env.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
}

http.createServer((req, res) => {
    // Basic CORS setup for the local server
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Proxy API requests to conso.boris.sh
    if (req.url.startsWith('/api/')) {
        const targetUrl = 'https://conso.boris.sh' + req.url;
        console.log(`[PROXY] Redirection de ${req.url} vers ${targetUrl}`);

        const options = {
            method: req.method,
            headers: {
                ...req.headers,
                'Authorization': 'Bearer ' + process.env.ENEDIS_TOKEN
            }
        };
        // Remove host to avoid SSL/DNS conflicts on the target API
        delete options.headers.host;
        // The referer might be localhost, let's remove it just in case
        delete options.headers.referer;

        const proxyReq = https.request(targetUrl, options, (proxyRes) => {
            // Forward headers and status code
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (e) => {
            console.error('[PROXY ERROR]', e);
            res.writeHead(500);
            res.end('Erreur de proxy interne');
        });

        req.pipe(proxyReq);
    } else {
        // Serve Static Files
        let filePath = '.' + req.url;
        if (filePath === './') filePath = './index.html';

        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
        };

        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code == 'ENOENT') {
                    res.writeHead(404);
                    res.end('Fichier non trouvé');
                } else {
                    res.writeHead(500);
                    res.end('Erreur serveur: ' + error.code + ' ..\n');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
}).listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Serveur backend local démarré avec succès !`);
    console.log(`👉 Ouvez votre navigateur à l'adresse : http://localhost:${PORT}`);
    console.log(`=========================================`);
});
