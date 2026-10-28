import http.server, os, sys, json, threading
ROOT = sys.argv[1]; PORT = int(sys.argv[2]); LOG = sys.argv[3]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(self,*a): pass
    def do_POST(self):
        n = int(self.headers.get('Content-Length',0)); body = self.rfile.read(n).decode()
        with open(LOG,'a') as f: f.write(json.dumps({'path':self.path,'ct':self.headers.get('Content-Type'),'body':body})+'\n')
        if self.path.startswith('/gracias'):
            self.send_response(200); self.send_header('Content-Type','text/html'); self.end_headers()
            self.wfile.write(open(os.path.join(ROOT,'gracias/index.html'),'rb').read()); return
        self.send_response(200); self.send_header('Content-Type','text/html'); self.end_headers(); self.wfile.write(b'ok')
    def send_head(self):
        p = self.translate_path(self.path.split('?')[0])
        if os.path.isdir(p) and not self.path.split('?')[0].endswith('/'):
            self.send_response(301); self.send_header('Location', self.path.split('?')[0]+'/'); self.end_headers(); return None
        if not os.path.exists(p) and not os.path.isdir(p):
            self.send_response(404); self.send_header('Content-Type','text/html'); self.end_headers()
            self.wfile.write(open(os.path.join(ROOT,'404.html'),'rb').read()); return None
        return super().send_head()
http.server.ThreadingHTTPServer(('127.0.0.1',PORT),H).serve_forever()
