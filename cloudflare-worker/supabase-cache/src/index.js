/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx) {
		// Add this at the start of the fetch handler
		if (request.url.includes('/clear-cache')) {
			const cache = caches.default;
			await cache.delete(new Request('http://127.0.0.1:8787/rest/v1/templates'));
			return new Response('Cache cleared', {
				headers: { 'Content-Type': 'text/plain' }
			});
		}

		// Add CORS headers to all responses
		const corsHeaders = {
			'Access-Control-Allow-Origin': 'http://localhost:5173', // Only set one origin
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, accept-profile, accept, x-supabase-api-version',
			'Access-Control-Expose-Headers': 'content-range',
			'Access-Control-Max-Age': '86400',
		};

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: corsHeaders
			});
		}

		try {
			// Parse the request URL
			const url = new URL(request.url);
			
			// Create new headers object
			const headers = new Headers();
			
			// Copy all headers from the original request
			for (const [key, value] of request.headers.entries()) {
				headers.set(key, value);
			}
			
			// Ensure the API key is set
			const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyY3lpZXpsd3V0Zmp2Zmtsa2dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNTQ1MjQsImV4cCI6MjA1NjczMDUyNH0.hlL8QRmt-efTiwcSZ_P3NfnWq8INKU7o0-3gTQt3prA';
			headers.set('apikey', apiKey);
			headers.set('Authorization', `Bearer ${apiKey}`);

			// Forward the request to Supabase
			const supabaseUrl = 'https://srcyiezlwutfjvfklkgi.supabase.co';
			const supabaseRequest = new Request(`${supabaseUrl}${url.pathname}${url.search}`, {
				method: request.method,
				headers: headers,
				body: request.body
			});

			// Make the request to Supabase
			const response = await fetch(supabaseRequest);
			
			// Create a new response with CORS headers
			const responseHeaders = new Headers();
			
			// Add CORS headers
			for (const [key, value] of Object.entries(corsHeaders)) {
				responseHeaders.set(key, value);
			}
			
			// Add the response headers, except Access-Control-Allow-Origin
			for (const [key, value] of response.headers.entries()) {
				if (key.toLowerCase() !== 'access-control-allow-origin') {
					responseHeaders.set(key, value);
				}
			}

			// Create the final response
			const newResponse = new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: responseHeaders
			});

			return newResponse;
		} catch (error) {
			console.error('Worker error:', error);
			// Return error response with CORS headers
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					...corsHeaders
				}
			});
		}
	}
};
