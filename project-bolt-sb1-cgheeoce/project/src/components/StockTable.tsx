// src/components/StockTable.tsx

import React, { useState, useMemo } from 'react';
import { Package, Search, ChevronDown } from 'lucide-react';
import { StockItem } from '../types';

interface StockTableProps {
  items: StockItem[];
  onSell: (item: StockItem) => void;
}

export default function StockTable({ items, onSell }: StockTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProformas, setSelectedProformas] = useState<string[]>([]);
  const [proformaOpen, setProformaOpen] = useState(false);

  const uniqueProformas = useMemo(
    () => Array.from(new Set(items.map(it => it.proforma_number))).sort(),
    [items]
  );

  const toggleProforma = (p: string) => {
    setSelectedProformas(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const filtered = useMemo(() => {
    const terms = searchTerm
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return items.filter(it => {
      const byProforma =
        selectedProformas.length === 0 ||
        selectedProformas.includes(it.proforma_number);

      const text = `${it.description} ${it.proforma_number}`.toLowerCase();
      const byKeywords = terms.every(term => text.includes(term));

      return byProforma && byKeywords;
    });
  }, [items, selectedProformas, searchTerm]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header + Search + Filter */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Package className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Stoc Curent</h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {filtered.length} / {items.length} articole
          </span>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-2/5">
          {/* Filter dropdown button */}
          <div className="relative">
            <button
              onClick={() => setProformaOpen(o => !o)}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              Filtrează
              <ChevronDown className="w-4 h-4 ml-1 text-gray-600" />
            </button>
            {proformaOpen && (
              <div className="absolute left-0 mt-2 w-56 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg z-10 p-2">
                {uniqueProformas.map(p => (
                  <label key={p} className="flex items-center space-x-2 py-1 px-2 hover:bg-gray-100 rounded">
                    <input
                      type="checkbox"
                      checked={selectedProformas.includes(p)}
                      onChange={() => toggleProforma(p)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 truncate max-w-[100px]">{p}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {/* Keyword search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Caută…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produs</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantitate</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Preț Acasa Unitar</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Preț final Unitar</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ultima actualizare</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(item => {
                const pretPlusTaxe = item.unit_price;
                const pretFinal = item.value;
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 whitespace-normal">
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-1" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.description}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">Proforma: {item.proforma_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">€ {pretPlusTaxe.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">€ {pretFinal.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{new Date(item.updated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button onClick={() => onSell(item)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">Vinde</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Nu există articole care să corespundă căutării</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
