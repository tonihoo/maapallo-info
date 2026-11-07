#!/usr/bin/env python3
"""Serve the UN SDG API in the shape Oskari 3.4 expects.

Oskari lists indicators by downloading every data page at 2500 rows. That
request now takes longer than Oskari's read timeout, so the theme-map
indicator menu stays on "Ladataan..." and never receives a dataset.

Listing only needs the dimensions and the years. This proxy answers that
scan from one small sample. A search that already names a year is fetched
in small pages and returned as a single page.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import urllib.error
import urllib.parse
import urllib.request

UPSTREAM = "https://unstats.un.org/SDGAPI/v1/sdg"
LISTEN = ("127.0.0.1", 8092)
PAGE_SIZE = 100
MAX_PAGES = 40
UA = "maapallo-info"


def fetch(path, query):
    url = UPSTREAM + "/" + path.lstrip("/")
    encoded = urllib.parse.urlencode(query, doseq=True)
    if encoded:
        url += "?" + encoded
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.loads(response.read().decode())


def discovery(query):
    sample_query = {key: values for key, values in query.items() if key not in ("page", "pageSize")}
    sample_query["pageSize"] = ["5"]
    sample = fetch("Indicator/Data/", sample_query)
    # Two areas per year so Oskari keeps the year (it drops years seen once).
    this_year = datetime.now(timezone.utc).year
    rows = []
    for year in range(2000, this_year - 1):
        for geo in ("246", "752"):
            rows.append({
                "value": "0",
                "valueType": "Float",
                "geoAreaCode": geo,
                "timePeriodStart": year,
                "source": "United Nations Statistics Division",
            })
    return {
        "size": len(rows),
        "totalElements": len(rows),
        "totalPages": 1,
        "pageNumber": 1,
        "attributes": sample.get("attributes") or [],
        "dimensions": sample.get("dimensions") or [],
        "data": rows,
    }


def collect(query):
    base = {key: values for key, values in query.items() if key not in ("page", "pageSize")}
    first = fetch("Indicator/Data/", dict(base, pageSize=[str(PAGE_SIZE)], page=["1"]))
    total_pages = min(int(first.get("totalPages") or 1), MAX_PAGES)
    rows = list(first.get("data") or [])

    def load(page):
        body = fetch("Indicator/Data/", dict(base, pageSize=[str(PAGE_SIZE)], page=[str(page)]))
        return page, body.get("data") or []

    if total_pages > 1:
        with ThreadPoolExecutor(max_workers=6) as pool:
            for page, data in pool.map(load, range(2, total_pages + 1)):
                rows.extend(data)
    return {
        "size": len(rows),
        "totalElements": len(rows),
        "totalPages": 1,
        "pageNumber": 1,
        "attributes": first.get("attributes") or [],
        "dimensions": first.get("dimensions") or [],
        "data": rows,
    }


def indicator_data(query):
    # Oskari stops when pageNumber >= totalPages. Later pages are empty.
    page = (query.get("page") or ["1"])[0]
    if page not in ("1", ""):
        return {
            "size": 0,
            "totalElements": 0,
            "totalPages": 1,
            "pageNumber": int(page),
            "attributes": [],
            "dimensions": [],
            "data": [],
        }
    if "timePeriod" not in query:
        return discovery(query)
    return collect(query)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if not parsed.path.startswith("/sdg/"):
            self.send_error(404)
            return
        relative = parsed.path[len("/sdg/"):]
        query = urllib.parse.parse_qs(parsed.query, keep_blank_values=False)
        try:
            if relative.rstrip("/") == "Indicator/Data":
                body = indicator_data(query)
            else:
                body = fetch(relative, query)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            payload = json.dumps({"error": str(error)}).encode()
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        payload = json.dumps(body).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *args):
        print("unsd-proxy", fmt % args, flush=True)


if __name__ == "__main__":
    server = ThreadingHTTPServer(LISTEN, Handler)
    print("UN SDG proxy on http://%s:%s/sdg" % LISTEN, flush=True)
    server.serve_forever()
