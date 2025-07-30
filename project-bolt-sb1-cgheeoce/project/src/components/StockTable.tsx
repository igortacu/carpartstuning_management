// src/components/StockTable.tsx

import React, { useState, useMemo } from 'react';
import { Package, Search, ChevronDown } from 'lucide-react';
import { StockItem } from '../types';

interface GroupedStock {
  id: string;
  description: string;
  unit: string;
  unit_price: number;            // preț acasa unitar
  final_unit_price: number;      // preț final unitar
  quantity: number;
  proforma_numbers: string[];
  updated_at: string;
  items: StockItem[];
}

interface StockTableProps {
  items: StockItem[];
  onSell: (item: StockItem) => void;
}

export default function StockTable({ items, onSell }: StockTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProformas, setSelectedProformas] = useState<string[]>([]);
  const [proformaOpen, setProformaOpen] = useState(false);

  // Group items by description, unit_price, final_unit_price, and unit
  const groupedItems = useMemo((): GroupedStock[] => {
    const map = new Map<string, GroupedStock>();
    items.forEach(it => {
      const key = `${it.description}__${it.unit_price}__${it.value}__${it.unit}`;
      if (!map.has(key)) {
        map.set(key, {
          id: it.id,
          description: it.description,
          unit: it.unit,
          unit_price: it.unit_price,
          final_unit_price: it.value,
          quantity: it.quantity,
          proforma_numbers: [it.proforma_number],
          updated_at: it.updated_at,
          items: [it],
        });
      } else {
        const grp = map.get(key)!;
        grp.quantity += it.quantity;
        grp.proforma_numbers.push(it.proforma_number);
        grp.updated_at = new Date(grp.updated_at) > new Date(it.updated_at)
          ? grp.updated_at
          : it.updated_at;
        grp.items.push(it);
      }
    });
    return Array.from(map.values());
  }, [items]);

  const uniqueProformas = useMemo(
    () => Array.from(new Set(groupedItems.flatMap(g => g.proforma_numbers))).sort(),
    [groupedItems]
  );

  const toggleProforma = (p: string) => {
    setSelectedProformas(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  // Filter grouped items by selected proformas and keywords
  const filtered = useMemo(() => {
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    return groupedItems.filter(group => {
      const byProforma = selectedProformas.length === 0
        ? true
        : group.proforma_numbers.some(p => selectedProformas.includes(p));
      const text = `${group.description} ${group.proforma_numbers.join(' ')}`.toLowerCase();
      const byKeywords = terms.every(term => text.includes(term));
      return byProforma && byKeywords;
    });
  }, [groupedItems, selectedProformas, searchTerm]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header + Filter + Search */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Package className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Stoc Curent</h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {filtered.length} / {groupedItems.length} articole
          </span>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-2/5">
          {/* Filter dropdown */}
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
          {/* Search input */}
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

      {/* Table */}
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
              {filtered.map(group => (
                <tr key={group.id}>
                  <td className="px-4 py-3 whitespace-normal">
                    <div className="text-sm font-medium text-gray-900">{group.description}</div>
                    {group.proforma_numbers.map(p => (
                      <div key={p} className="text-xs text-gray-500">Proforma: {p}</div>
                    ))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {group.quantity} {group.unit}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    € {group.unit_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    € {group.final_unit_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {new Date(group.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => onSell({ ...group.items[0], quantity: group.quantity, value: group.final_unit_price })}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Vinde
                    </button>
                  </td>
                </tr>
              ))}
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
