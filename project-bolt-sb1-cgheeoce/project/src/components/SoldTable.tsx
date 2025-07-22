import React, { useState, useMemo } from 'react';
import { ShoppingCart, Calendar, Search } from 'lucide-react';
import { SoldItem } from '../types';

interface SoldTableProps {
  items: SoldItem[];
}

export default function SoldTable({ items }: SoldTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(
    () =>
      items.filter((it) =>
        it.description.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [items, searchTerm]
  );

  const totalRevenue = filtered.reduce((sum, i) => sum + i.total_value, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header + Search */}
      <div className="px-6 py-4 bg-gray-50 border-b flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Vânzări</h3>
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
            {filtered.length} / {items.length} tranzacții
          </span>
        </div>
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Caută descriere…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* only scroll vertically if more than 10 */}
        <div
          className={
            filtered.length > 5
              ? 'max-h-[480px] overflow-y-auto'
              : undefined
          }
        >
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Descriere
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Cantitate
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Preț unitar
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Total
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Data
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3">
                    {item.quantity_sold} {item.unit}
                  </td>
                  <td className="px-4 py-3">
                    € {item.sale_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-green-600">
                    € {item.total_value.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>
                        {new Date(item.sold_date).toLocaleString()}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    Nicio vânzare găsită
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer total */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-right text-sm text-gray-700">
        Total înregistrat: <span className="font-semibold">€ {totalRevenue.toFixed(2)}</span>
      </div>
    </div>
  );
}
