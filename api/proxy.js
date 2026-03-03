const https = require('https');

module.exports = (req, res) => {
    // Basic CORS (not really needed for Vercel, but for safety)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).send();
        return;
    }

    // Proxy request using the URL from the request path
    // e.g., /api/daily_consumption?...
    const targetUrl = 'https://conso.boris.sh' + req.url;

    const options = {
        method: req.method,
        headers: {
            ...req.headers,
            'Authorization': 'Bearer ' + process.env.ENEDIS_TOKEN
        }
    };

    // Remove headers to avoid SSL/DNS issues on the target
    delete options.headers.host;
    delete options.headers.referer;

    const proxyReq = https.request(targetUrl, options, (proxyRes) => {
        res.status(proxyRes.statusCode);
        // Forward headers
        Object.keys(proxyRes.headers).forEach(key => {
            res.setHeader(key, proxyRes.headers[key]);
        });

        proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
        console.error('[PROXY ERROR]', e);
        res.status(500).send('Erreur de proxy interne');
    });

    req.pipe(proxyReq);
};
