import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StockItem } from '../types';
import { formatDateForInsert } from '../utils/formatDate';

async function extractRemoteStock(
  file: File
): Promise<{ metadata: Record<string, string>; items: StockItem[] }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('http://localhost:8000/extract-stock', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Extraction failed (${res.status}): ${text}`);
  }
  return res.json();
}

export default function DocumentUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles]           = useState<File[]>([]);
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [extractedItems, setExtractedItems] = useState<StockItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (dropped.length) {
      setFiles(prev => [...prev, ...dropped]);
      processFiles(dropped);
    }
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
    if (selected.length) {
      setFiles(prev => [...prev, ...selected]);
      processFiles(selected);
    }
  };
  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };
  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));
  const clearAll   = () => {
    setFiles([]); setExtractedItems([]); setMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async (filesToProcess: File[]) => {
    setLoading(true);
    setMessage(null);
    const allItems: StockItem[] = [];

    try {
      for (const file of filesToProcess) {
        const { metadata, items } = await extractRemoteStock(file);

        // Normalize date into ISO before insert
        const isoDate = formatDateForInsert(metadata.date);
        const supplier = metadata.supplier || '';

        if (!items.length) continue;
        allItems.push(...items);

        for (const item of items) {
          // look up by description + proforma
          const { data: existing, error: fetchErr } = await supabase
            .from('stock_items')
            .select('*')
            .eq('description', item.description)
            .eq('proforma_number', metadata.proforma_number);
          if (fetchErr) throw fetchErr;

          const baseRecord = {
            ...item,
            supplier,
            proforma_number: metadata.proforma_number,
            serie:           metadata.serie,
            date:            isoDate,
            currency:        metadata.currency,
          };

          if (existing && existing.length > 0) {
            // update only quantity & updated_at
            const updatedQty = existing[0].quantity + item.quantity;
            const { error: updErr } = await supabase
              .from('stock_items')
              .update({ quantity: updatedQty, updated_at: new Date().toISOString() })
              .eq('id', existing[0].id);
            if (updErr) throw updErr;

          } else {
            // insert full record
            const { error: insErr } = await supabase
              .from('stock_items')
              .insert([
                {
                  ...baseRecord,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ]);
            if (insErr) throw insErr;
          }
        }
      }

      setExtractedItems(allItems);
      setMessage(
        allItems.length
          ? { type: 'success', text: `Processed ${allItems.length} items from ${filesToProcess.length} file(s).` }
          : { type: 'error',   text: `No stock items found in the selected document(s).` }
      );

    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: `Error: ${err.message}` });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b text-center">
          <Upload className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Upload Proforma PDF</h2>
          <p className="text-gray-600">Drag & drop PDF or click to browse.</p>
        </div>

        <div className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          <div
            onClick={openFilePicker}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-12 text-center transition ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} />
            <p className="text-lg">{dragActive ? 'Drop files here' : 'Drop your PDF here'}</p>
            {loading && (
              <div className="flex items-center justify-center mt-4 space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                <span className="text-blue-600">Processing…</span>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Uploaded Files</h3>
                <button onClick={clearAll} className="text-red-500 text-sm">Clear All</button>
              </div>
              <div className="space-y-2">
                {files.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size/1024/1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button onClick={() => removeFile(idx)} className="p-1 hover:bg-gray-200 rounded">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {message && (
            <div className={`mt-6 p-4 rounded border ${message.type==='success'? 'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}>
              {message.type==='success'
                ? <CheckCircle className="inline w-5 h-5 text-green-500 mr-2" />
                : <AlertCircle className="inline w-5 h-5 text-red-500 mr-2" />}
              <span className={message.type==='success'? 'text-green-700':'text-red-700'}>{message.text}</span>
            </div>
          )}

          {extractedItems.length > 0 && (
            <div className="mt-6 bg-blue-50 p-4 rounded">
              <h3 className="font-medium mb-2">Extracted Items Preview</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 text-left">Line</th>
                      <th className="px-2 py-1 text-left">Description</th>
                      <th className="px-2 py-1 text-left">Unit</th>
                      <th className="px-2 py-1 text-left">Qty</th>
                      <th className="px-2 py-1 text-left">Price</th>
                      <th className="px-2 py-1 text-left">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedItems.slice(0,10).map((item,i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{item.line_number}</td>
                        <td className="px-2 py-1 truncate max-w-xs">{item.description}</td>
                        <td className="px-2 py-1">{item.unit}</td>
                        <td className="px-2 py-1">{item.quantity}</td>
                        <td className="px-2 py-1">{item.unit_price}</td>
                        <td className="px-2 py-1">{item.value}</td>
                      </tr>
                    ))}
                    {extractedItems.length > 10 && (
                      <tr>
                        <td colSpan={6} className="py-2 text-center text-gray-500">
                          …and {extractedItems.length-10} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
