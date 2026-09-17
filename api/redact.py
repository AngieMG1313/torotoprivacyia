"""
Toroto Privacy IA - redaction function.

Performs REAL content removal (not a visual overlay) for every approved
region, using PyMuPDF's redaction annotations. This is deliberately the only
place in the app that mutates PDF content, and it never talks to Gemini -
it only ever acts on regions a human has already approved (enforced by the
Node API before this is called).

Request body (JSON):
  {
    "pdfUrl": "https://.../original.pdf",
    "regions": [
      {"page": 1, "x": 0.12, "y": 0.34, "width": 0.2, "height": 0.03}
    ]
  }
Coordinates are normalized 0-1, top-left origin, matching
knowledge/gemini-response-schema-v1.json's NORMALIZED_0_1 location objects
and PyMuPDF's own top-left-origin page coordinate space (no y-flip needed).

Response: the redacted PDF bytes, content-type application/pdf.
"""

import json
from http.server import BaseHTTPRequestHandler

import pymupdf as fitz  # PyMuPDF - `fitz` is the legacy import alias
import requests


def redact_pdf(pdf_bytes: bytes, regions: list[dict]) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    by_page: dict[int, list[dict]] = {}
    for region in regions:
        by_page.setdefault(int(region["page"]), []).append(region)

    for page_number, page_regions in by_page.items():
        page_index = page_number - 1
        if page_index < 0 or page_index >= doc.page_count:
            continue
        page = doc[page_index]
        page_width = page.rect.width
        page_height = page.rect.height

        for region in page_regions:
            x, y, w, h = region["x"], region["y"], region["width"], region["height"]
            if None in (x, y, w, h):
                # Should never reach here - the Node API requires a resolved
                # manual_location before a detection can be approved/redacted.
                continue
            rect = fitz.Rect(
                x * page_width,
                y * page_height,
                (x + w) * page_width,
                (y + h) * page_height,
            )
            page.add_redact_annot(rect, fill=(0, 0, 0))

        # PDF_REDACT_IMAGE_PIXELS blanks out just the redacted pixels of any
        # image overlapping the box (e.g. a signature on a scanned page)
        # instead of removing the whole image or leaving it untouched.
        images_mode = getattr(fitz, "PDF_REDACT_IMAGE_PIXELS", 2)
        page.apply_redactions(images=images_mode)

    # Strip document metadata and any XML/XMP metadata stream - redacted text
    # is useless if the filename, author or XMP history still reveals it.
    try:
        doc.set_metadata({})
    except Exception:
        pass
    try:
        doc.del_xml_metadata()
    except Exception:
        pass

    # garbage=4 drops now-orphaned objects (including remnants of redacted
    # content streams); clean=True sanitizes/rewrites content streams.
    return doc.tobytes(garbage=4, deflate=True, clean=True)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            payload = json.loads(body)

            pdf_url = payload["pdfUrl"]
            regions = payload.get("regions", [])

            source = requests.get(pdf_url, timeout=25)
            source.raise_for_status()

            redacted_bytes = redact_pdf(source.content, regions)

            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.end_headers()
            self.wfile.write(redacted_bytes)
        except Exception as exc:  # noqa: BLE001 - surface the error to the caller
            error_body = json.dumps({"error": str(exc)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(error_body)
