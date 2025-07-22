// src/components/SaleModal.tsx

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { StockItem, InAsteptareItem, SaleContext } from '../types'

type Item = StockItem | InAsteptareItem

interface SaleModalProps {
  item: Item
  context: SaleContext
  onConfirm: (
    soldQty: number,
    saleTotal: number,
    source: string,
    totalPieces?: number,
    allSold?: boolean,
    comment?: string
  ) => void
  onCancel: () => void
}

export default function SaleModal({
  item,
  context,
  onConfirm,
  onCancel,
}: SaleModalProps) {
  const available =
    context === 'stock'
      ? (item as StockItem).quantity
      : (item as InAsteptareItem).qty_pending

  const pretFinal =
    context === 'stock' && typeof (item as StockItem).value === 'number'
      ? (item as StockItem).value
      : 0

  const [allSold, setAllSold] = useState(true)
  const [soldQty, setSoldQty] = useState(1)
  const [totalPieces, setTotalPieces] = useState(available)
  const [comment, setComment] = useState('')
  const [source, setSource] = useState('Prieteni')
  const [saleTotal, setSaleTotal] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const totalNum = parseFloat(saleTotal.replace(',', '.'))
    if (!allSold && (soldQty < 1 || soldQty > totalPieces)) return
    if (isNaN(totalNum) || totalNum <= 0) return

    onConfirm(
      soldQty,
      totalNum,
      source,
      allSold ? undefined : totalPieces,
      allSold,
      allSold ? undefined : comment
    )
  }

  return (
    <AnimatePresence>
      {/* Frosted‑glass white backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Vânzare: {item.description}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {/* Partial sale toggle */}
            <div className="col-span-full flex items-center space-x-2">
              <input
                type="checkbox"
                checked={!allSold}
                onChange={e => setAllSold(!e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-base text-gray-700">
                Vânzare parțială?
              </label>
            </div>

            {/* Read‑only Preț final */}
            {context === 'stock' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Preț final (€)
                </label>
                <input
                  type="text"
                  readOnly
                  value={pretFinal.toFixed(2)}
                  className="mt-1 block w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-800"
                />
              </div>
            )}

            {/* Quantity */}
            {allSold ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cantitate de vândut
                </label>
                <input
                  type="number"
                  min={1}
                  max={available}
                  value={soldQty}
                  onChange={e => setSoldQty(+e.target.value)}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Câte piese vând acum
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={soldQty}
                    onChange={e => setSoldQty(+e.target.value)}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    În total în pachet
                  </label>
                  <input
                    type="number"
                    min={soldQty}
                    value={totalPieces}
                    onChange={e => setTotalPieces(+e.target.value)}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Comentariu
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {/* Free‑form Preț vânzare total */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Preț vânzare total (€)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={saleTotal}
                onChange={e => setSaleTotal(e.target.value)}
                placeholder="Ex: 1234.56"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Sursă */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Sursă
              </label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                {[
                  'TikTok',
                  'Instagram',
                  'Facebook',
                  'Prieteni',
                  'Google',
                  'Altele',
                ].map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="sm:col-span-2 flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Înregistrează
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
