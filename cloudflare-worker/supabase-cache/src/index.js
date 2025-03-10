/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

async function handleSupabaseStorageRequest(request, env, ctx) {
	// Extract the path from the URL
	const url = new URL(request.url);
	const path = url.pathname;
  
	// Check if this is a storage request
	if (path.startsWith('/storage/v1/object/')) {
	  console.log('Handling storage request:', path);
	  
	  // Check cache first
	  const cache = caches.default;
	  let response = await cache.match(request);
	  
	  if (response) {
		console.log('Cache hit for:', path);
		return response;
	  }
	  
	  console.log('Cache miss for:', path);
	  
	  // Create a new request to forward to Supabase
	  const supabaseUrl = env.SUPABASE_URL || 'https://srcyiezlwutfjvfklkgi.supabase.co';
	  const targetUrl = `${supabaseUrl}${path}`;
	  
	  // Clone the request and modify as needed
	  const newRequest = new Request(targetUrl, {
		method: request.method,
		headers: new Headers(request.headers),
		body: request.body,
		// Make sure to include this for file uploads
		duplex: 'half'
	  });
	  
	  // Forward any Authorization header from the original request
	  const authHeader = request.headers.get('Authorization');
	  if (authHeader) {
		newRequest.headers.set('Authorization', authHeader);
	  } else {
		// If no auth header, add the anon key as a fallback
		newRequest.headers.set('apikey', env.SUPABASE_ANON_KEY);
	  }
	  
	  // Log request details for debugging
	  console.log('Forwarding storage request to:', targetUrl);
	  console.log('Request method:', request.method);
	  console.log('Content-Type:', request.headers.get('Content-Type'));
	  console.log('Authorization present:', !!authHeader);
	  
	  try {
		// Forward the request to Supabase
		const response = await fetch(newRequest);
		
		// Only cache GET requests with successful responses
		if (request.method === 'GET' && response.ok) {
		  // Clone the response before caching
		  const responseToCache = response.clone();
		  ctx.waitUntil(cache.put(request, responseToCache));
		  console.log('Cached response for:', path);
		}
		
		// Log response status for debugging
		console.log('Supabase storage response status:', response.status);
		
		// Clone and return the response
		const newResponse = new Response(response.body, response);
		
		// Add CORS headers if needed
		newResponse.headers.set('Access-Control-Allow-Origin', '*');
		newResponse.headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
		
		return newResponse;
	  } catch (error) {
		console.error('Error forwarding storage request:', error);
		return new Response(JSON.stringify({
		  error: 'Error forwarding storage request',
		  message: error.message
		}), {
		  status: 500,
		  headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		  }
		});
	  }
	}
	
	// If not a storage request, continue with other handlers
	return null;
  }

export default {
	async fetch(request, env, ctx) {
		// First check if it's a storage request and handle it specially
		const storageResponse = await handleSupabaseStorageRequest(request, env, ctx);
		if (storageResponse) {
			return storageResponse;
		}
		
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
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
			'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, accept-profile, content-profile, prefer, accept, x-supabase-api-version, x-upsert',
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
