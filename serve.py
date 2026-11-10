"""Run the static portfolio on http://127.0.0.1:4173."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


class PortfolioHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.resolve_route()
        super().do_GET()

    def do_HEAD(self):
        self.resolve_route()
        super().do_HEAD()

    def resolve_route(self):
        path = urlsplit(self.path).path
        local_path = Path(self.translate_path(path))
        if local_path.is_dir() and (local_path / "index.html").is_file():
            self.path = path.rstrip("/") + "/index.html"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    dist = Path(__file__).resolve().parent / "dist"
    handler = partial(PortfolioHandler, directory=str(dist))
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Local: http://127.0.0.1:{server.server_port}", flush=True)
        server.serve_forever()
