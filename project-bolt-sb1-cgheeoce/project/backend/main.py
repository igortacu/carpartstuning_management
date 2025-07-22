# backend/main.py

import io
import re
from typing import List, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
from pydantic import BaseModel
import math

app = FastAPI()

# ─── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Data models ─────────────────────────────────────────────────────────────
class Metadata(BaseModel):
    proforma_number: str
    serie:           str
    date:            str
    currency:        str
    supplier:        str

class StockItem(BaseModel):
    line_number: int
    description: str
    unit:        str
    quantity:    float
    unit_price:  float
    value:       float
    vat:         float

class ExtractResponse(BaseModel):
    metadata: Metadata
    items:    List[StockItem]

# ─── Helpers ─────────────────────────────────────────────────────────────────
def extract_metadata(text: str) -> Metadata:
    proforma = (re.search(r"Proforma\s+nr\.?\s*[:\-]?\s*(\d+)", text, re.IGNORECASE) or ["", ""])[1]
    serie    = (re.search(r"Serie\s*[:\-]?\s*(\S+)", text, re.IGNORECASE) or ["", ""])[1]
    date     = (re.search(r"Data\s*[:\-]?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})", text, re.IGNORECASE) or ["", ""])[1]
    currency = (re.search(r"Moneda\s*[:\-]?\s*(\w{3})", text, re.IGNORECASE) or ["", ""])[1].upper()
    supplier = (re.search(r"Furnizor\s*[:\-]?\s*(.+)", text, re.IGNORECASE) or ["", ""])[1].strip()
    return Metadata(
        proforma_number=proforma,
        serie=serie,
        date=date,
        currency=currency,
        supplier=supplier,
    )

def parse_number(cell: str) -> float:
    return float(cell.replace(",", ".").strip()) if cell else 0.0

def extract_items_from_pdf_stream(stream: io.BytesIO) -> Dict[str, Any]:
    items: List[Dict[str, Any]] = []
    with pdfplumber.open(stream) as pdf:
        # 1) Extract full text for metadata
        full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        metadata = extract_metadata(full_text)

        # 2) On each page, extract the raw table
        for page in pdf.pages:
            table = page.extract_table(
                {"vertical_strategy": "lines", "horizontal_strategy": "lines"}
            )
            if not table:
                continue

            # Filter to rows where the first cell is a number (skip header, footers, blanks)
            data_rows = [
                row for row in table
                if row and row[0] and row[0].strip().isdigit()
            ]

            for row in data_rows:
                nr   = row[0]
                desc = row[1]
                um   = row[2]
                qty  = row[3]
                prc  = row[4]
                vat  = row[8]  # TVA

                q = parse_number(qty)
                p = parse_number(prc)

                # round to nearest 10:
                price_plus_taxes = round((p * 1.35) / 10) * 10
                price_final      = round((p * 1.70) / 10) * 10

                items.append({
                    "line_number":      int(nr.strip()),
                    "description":      desc.strip(),
                    "unit":             um.strip().lower(),
                    "quantity":         q,
                    "unit_price":       price_plus_taxes,
                    "value":            price_final,
                    "vat":              parse_number(vat),
                })

    return {"metadata": metadata, "items": items}

# ─── Endpoint ────────────────────────────────────────────────────────────────
@app.post("/extract-stock", response_model=ExtractResponse)
async def extract_stock(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported.")
    content = await file.read()
    result = extract_items_from_pdf_stream(io.BytesIO(content))
    return ExtractResponse(**result)

# Run with:
# python -m uvicorn main:app --reload --port 8000
