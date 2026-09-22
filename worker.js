export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Proxy API requests to conso.boris.sh
        if (url.pathname.startsWith('/api/')) {
            // Handle CORS preflight
            if (request.method === 'OPTIONS') {
                return new Response(null, {
                    status: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    },
                });
            }

            const targetUrl = 'https://conso.boris.sh' + url.pathname + url.search;
            const token = env.ENEDIS_TOKEN || '';

            const newHeaders = new Headers(request.headers);
            newHeaders.set('Authorization', 'Bearer ' + token);
            newHeaders.delete('host');
            newHeaders.delete('referer');

            try {
                const fetchOptions = {
                    method: request.method,
                    headers: newHeaders,
                };

                if (request.method !== 'GET' && request.method !== 'HEAD') {
                    fetchOptions.body = request.body;
                }

                const response = await fetch(targetUrl, fetchOptions);
                const responseHeaders = new Headers(response.headers);
                responseHeaders.set('Access-Control-Allow-Origin', '*');

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: responseHeaders,
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message || 'Erreur de proxy interne' }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }
        }

        // Serve static assets from ./dist (index.html, style.css, app.js, etc.)
        return env.ASSETS.fetch(request);
    }
};
