// src/global.d.ts
declare module 'pdfjs-dist/legacy/build/pdf' {
  import type { PDFDocumentProxy, GetDocumentParams } from 'pdfjs-dist';
  export const getDocument: (src: GetDocumentParams) => { promise: Promise<PDFDocumentProxy> };
  export const GlobalWorkerOptions: { workerSrc: string };
}

declare module 'pdfjs-dist/build/pdf.worker.entry';
// src/global.d.ts
declare module 'react-beautiful-dnd';
