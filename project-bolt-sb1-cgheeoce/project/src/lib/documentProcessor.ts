// src/lib/documentProcessor.ts

import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
// În Vite, suffix-ul `?url` face ca worker-ul să fie copiat ca asset și servit cu MIME corect:
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

// ─────────────── Setăm workerSrc global ───────────────
GlobalWorkerOptions.workerSrc = workerUrl;

// ─────────────── Interface StockItem ───────────────
export interface StockItem {
  line_number:     number;
  description:     string;
  unit:            string;
  quantity:        number;
  unit_price:      number;
  value:           number;
  vat:             number;
  supplier:        string;
  proforma_number: string;
  serie:           string;
  date:            string;
  currency:        string;
}

// ─────────────── Extrage text din PDF ───────────────
async function extractTextFromPDF(file: File): Promise<string> {
  console.log('[extractTextFromPDF] Loading PDF document');
  const arrayBuffer = await file.arrayBuffer();
  console.log('[extractTextFromPDF] Read arrayBuffer, byteLength:', arrayBuffer.byteLength);

  const loadingTask = getDocument({
    data: arrayBuffer,
    disableFontFace: true,
    verbosity: 0,
    standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
    cMapUrl:              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
    cMapPacked:           true,
    // workerSrc e deja setat global, nu trebuie să-l mai punem aici
  });

  try {
    const pdf = await loadingTask.promise;
    console.log('[extractTextFromPDF] PDF loaded, numPages:', pdf.numPages);

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`[extractTextFromPDF] Processing page ${pageNum}`);
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += pageText + '\n';
    }

    console.log('[extractTextFromPDF] Completed all pages, total length:', fullText.length);
    return fullText;

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[extractTextFromPDF] Error processing PDF:', message);
    throw new Error(`Failed to extract text from PDF: ${message}`);
  }
}

// ─────────────── Extrage text din DOCX ───────────────
async function extractTextFromDOCX(file: File): Promise<string> {
  console.log('[extractTextFromDOCX] Loading DOCX document');
  const arrayBuffer = await file.arrayBuffer();
  console.log('[extractTextFromDOCX] Read arrayBuffer, byteLength:', arrayBuffer.byteLength);
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  console.log('[extractTextFromDOCX] Extracted text length:', value.length);
  return value;
}

// ─────────────── Funcţia principală de extragere ───────────────
export async function extractTextFromFile(file: File): Promise<string> {
  console.log('[extractTextFromFile] Starting for file:', file.name, 'type:', file.type);
  if (file.type === 'application/pdf') {
    return extractTextFromPDF(file);
  }
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractTextFromDOCX(file);
  }
  throw new Error(`Unsupported file type: ${file.type}`);
}

// ─────────────── Parsare text → StockItem[] ───────────────
export function parseStockData(text: string): StockItem[] {
  console.log('[parseStockData] Starting parse, text length:', text.length);
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  console.log('[parseStockData] Total lines after filtering:', lines.length);

  const items: StockItem[] = [];
  const parseNum = (s: string) => parseFloat(s.replace(',', '.'));

  for (const line of lines) {
    const m = line.match(
      /^(\d+)\s+(.+?)\s+(buc|set|pcs|unit)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)$/
    );
    if (!m) continue;

    const [, num, desc, unit, qty, prc, val, vat] = m;
    items.push({
      line_number:    parseInt(num, 10),
      description:    desc.trim(),
      unit:           unit.toLowerCase(),
      quantity:       parseNum(qty),
      unit_price:     parseNum(prc),
      value:          parseNum(val),
      vat:            parseNum(vat),
      supplier:       '',
      proforma_number:'',
      serie:          '',
      date:           '',
      currency:       '',
    });
  }

  console.log('[parseStockData] Parsed items count:', items.length);
  return items;
}
