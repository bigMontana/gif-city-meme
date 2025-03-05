from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)

    def do_GET(self):
        # Serve view.html when accessing the root URL
        if self.path == '/':
            self.path = '/view.html'
        # Add proper MIME type for Service Worker
        elif self.path.endswith('sw.js'):
            self.send_header('Content-Type', 'application/javascript')
        return super().do_GET()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

port = 8000
httpd = HTTPServer(('localhost', port), CORSRequestHandler)
print(f"Serving at http://localhost:{port}")
httpd.serve_forever()