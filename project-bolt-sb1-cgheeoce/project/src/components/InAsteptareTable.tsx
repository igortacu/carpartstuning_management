// src/components/InAsteptareTable.tsx

import React, { useState, useMemo } from 'react';
import { Clock, Search } from 'lucide-react';
import { InAsteptareItem } from '../types';

interface Props {
  items: InAsteptareItem[];
  onSell: (i: InAsteptareItem) => void;
}

export default function InAsteptareTable({ items, onSell }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  // filter by description (you can extend to comment, etc.)
  const filtered = useMemo(
    () =>
      items.filter((it) =>
        it.description.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [items, searchTerm]
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header + Search */}
      <div className="px-6 py-4 bg-gray-50 border-b flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">În așteptare</h3>
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
            {filtered.length} / {items.length}
          </span>
        </div>
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Caută descriere…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={filtered.length > 5 ? 'max-h-[480px] overflow-y-auto' : ''}>
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Descriere
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Total
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Vândut
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Rămase
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Comentariu
                </th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3">{i.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {i.qty_total} {i.unit}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{i.qty_sold}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{i.qty_pending}</td>
                  <td className="px-4 py-3">{i.comment}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onSell(i)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    >
                      Vinde
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <Clock className="mx-auto mb-2" />
                    Nimic în așteptare
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
