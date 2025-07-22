// src/components/AddStockModal.tsx

import React, { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { StockItemInsert } from '../types'

interface Props {
  nextLine: number
  onConfirm: (item: StockItemInsert) => void
  onCancel: () => void
}

export default function AddStockModal({ nextLine, onConfirm, onCancel }: Props) {
  const [name, setName] = useState('')
  const [initialStr, setInitialStr] = useState('')   // preț inițial, as string
  const [unit, setUnit] = useState<'set' | 'buc'>('set')
  const [qty, setQty] = useState<number>(1)

  // parse initial → float
  const initial = useMemo(() => {
    const n = parseFloat(initialStr.replace(',', '.'))
    return isNaN(n) ? 0 : n
  }, [initialStr])

  // compute markups, rounded to nearest integer
  const pretAcasa = useMemo(() => Math.round(initial * 1.35), [initial])
  const pretFinal = useMemo(() => Math.round(initial * 1.70), [initial])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || initial <= 0 || qty < 1) return

    const newStock: StockItemInsert = {
      line_number:     nextLine,
      description:     name,
      unit,
      quantity:        qty,
      unit_price:      pretAcasa,     // Preț Acasă Unitar
      value:           pretFinal,     // Preț Final Unitar
      vat:             0,
      supplier:        '',
      proforma_number: '',
      serie:           '',
      date:            new Date().toISOString(),
      currency:        'EUR',
    }

    onConfirm(newStock)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Adaugă stoc manual</h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Denumire</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Initial price */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Preț inițial (€)</label>
            <input
              type="text"
              inputMode="decimal"
              value={initialStr}
              onChange={e => setInitialStr(e.target.value)}
              placeholder="0.00"
              className="w-full mt-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Computed prices */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p>Preț Acasă Unitar:</p>
              <p className="font-semibold">€ {pretAcasa}</p>
            </div>
            <div>
              <p>Preț Final Unitar:</p>
              <p className="font-semibold">€ {pretFinal}</p>
            </div>
          </div>

          {/* Unit & qty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Unitate</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="set">set</option>
                <option value="buc">buc</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cantitate</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={e => setQty(Math.max(1, +e.target.value))}
                className="w-full mt-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Adaugă Stoc
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
