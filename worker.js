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

            const token = env.ENEDIS_TOKEN;
            if (!token) {
                return new Response(JSON.stringify({
                    error: "Variable d'environnement ENEDIS_TOKEN non configurée dans Cloudflare (Settings > Variables and Secrets)."
                }), {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }

            const targetUrl = 'https://conso.boris.sh' + url.pathname + url.search;

            // Envoi d'en-têtes propres sans relayer les en-têtes internes Cloudflare (comme cf-connecting-ip qui cause l'Erreur 403 / Code 1000)
            const headers = {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            };

            const contentType = request.headers.get('content-type');
            if (contentType) {
                headers['Content-Type'] = contentType;
            }

            try {
                const fetchOptions = {
                    method: request.method,
                    headers: headers,
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
