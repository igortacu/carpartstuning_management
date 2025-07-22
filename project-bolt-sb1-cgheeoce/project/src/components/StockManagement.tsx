// src/components/StockManagement.tsx

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  StockItem,
  SoldItem,
  SoldItemInsert,
  InAsteptareItem,
  InAsteptareInsert,
  SaleContext,
} from '../types'
import StockTable from './StockTable'
import SoldTable from './SoldTable'
import InAsteptareTable from './InAsteptareTable'
import SaleModal from './SaleModal'

export default function StockManagement() {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [soldItems, setSoldItems] = useState<SoldItem[]>([])
  const [waitItems, setWaitItems] = useState<InAsteptareItem[]>([])
  const [loading, setLoading] = useState(true)

  const [showSaleModal, setShowSaleModal] = useState(false)
  const [modalCtx, setModalCtx] = useState<SaleContext>('stock')
  const [modalItem, setModalItem] = useState<StockItem | InAsteptareItem | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [sRes, soRes, wRes] = await Promise.all([
      supabase.from('stock_items').select('*').gt('quantity', 0).order('created_at', { ascending: false }),
      supabase.from('sold_items').select('*').order('sold_date', { ascending: false }),
      supabase.from('in_asteptare').select('*').order('created_at', { ascending: false }),
    ])
    if (!sRes.error) setStockItems(sRes.data as StockItem[])
    if (!soRes.error) setSoldItems(soRes.data as SoldItem[])
    if (!wRes.error) {
      const withPending = wRes.data.map(i => ({
        ...i,
        qty_pending: i.qty_total - i.qty_sold,
      }))
      setWaitItems(withPending as InAsteptareItem[])
    }
    setLoading(false)
  }

  function onSellStock(item: StockItem) {
    setModalCtx('stock')
    setModalItem(item)
    setShowSaleModal(true)
  }
  function onSellPending(item: InAsteptareItem) {
    setModalCtx('pending')
    setModalItem(item)
    setShowSaleModal(true)
  }

  async function handleSaleConfirm(
    soldQty: number,
    totalPrice: number,
    source: string,
    totalPieces?: number,
    allSold: boolean = true,
    comment?: string
  ) {
    if (!modalItem) return

    const isPending = modalCtx === 'pending'
    const stock_item_id = isPending
      ? (modalItem as InAsteptareItem).stock_item_id
      : (modalItem as StockItem).id

    // 1) Insert into sold_items
    const { data: auth } = await supabase.auth.getUser()
    const soldBy = auth.user?.email ?? 'Unknown'
    const sale: SoldItemInsert = {
      stock_item_id,
      name: (modalItem as any).name || modalItem.description,
      category: (modalItem as any).category || '',
      description: modalItem.description,
      unit: modalItem.unit,
      quantity_sold: soldQty,
      sale_price: totalPrice,
      total_value: totalPrice,
      sold_by: soldBy,
      sold_date: new Date().toISOString(),
      sursa: source,
    }
    const { data: ins, error: ie } = await supabase
      .from('sold_items')
      .insert([sale])
      .select('*')
      .single()
    if (ie || !ins) {
      console.error('Sale insert failed:', ie)
      setShowSaleModal(false)
      return
    }
    setSoldItems(s => [ins, ...s])

    // 2) Insert into sold_factura only for direct stock sales
    if (!isPending) {
      const pretFact = (modalItem as StockItem).value
      const { error: fe } = await supabase
        .from('sold_factura')
        .insert([
          {
            stock_item_id,
            product_name: modalItem.description,
            pret_vanzare_factura: pretFact,
            created_at: new Date().toISOString(),
          },
        ])
        .select('*')
        .single()
      if (fe) console.error('Factura insert failed:', fe)
    }

    // 3) Adjust stock vs pending
    if (isPending) {
      const p = modalItem as InAsteptareItem
      const newSold = p.qty_sold + soldQty
      const newPending = p.qty_total - newSold

      if (newSold >= p.qty_total) {
        setWaitItems(w => w.filter(x => x.id !== p.id))
        await supabase.from('in_asteptare').delete().eq('id', p.id)
      } else {
        setWaitItems(w =>
          w.map(x =>
            x.id === p.id ? { ...x, qty_sold: newSold, qty_pending: newPending } : x
          )
        )
        await supabase
          .from('in_asteptare')
          .update({ qty_sold: newSold })
          .eq('id', p.id)
      }
    } else {
      const s = modalItem as StockItem
      const rem = allSold ? s.quantity - soldQty : s.quantity - 1

      if (rem <= 0) {
        setStockItems(st => st.filter(x => x.id !== s.id))
        await supabase
          .from('stock_items')
          .update({ quantity: 0, value: 0, updated_at: new Date().toISOString() })
          .eq('id', s.id)
      } else {
        setStockItems(st =>
          st.map(x => (x.id === s.id ? { ...x, quantity: rem } : x))
        )
        await supabase
          .from('stock_items')
          .update({
            quantity: rem,
            value: rem * s.unit_price,
            updated_at: new Date().toISOString(),
          })
          .eq('id', s.id)
      }

      if (!allSold && totalPieces !== undefined) {
        const pending: InAsteptareInsert = {
          stock_item_id: s.id,
          description: s.description,
          unit: s.unit,
          qty_total: totalPieces,
          qty_sold: soldQty,
          comment: comment || '',
        }
        const { data: wIns, error: we } = await supabase
          .from('in_asteptare')
          .insert([pending])
          .select('*')
          .single()
        if (we) console.error('Pending insert failed:', we)
        else setWaitItems(w => [
          { ...wIns, qty_pending: wIns.qty_total - wIns.qty_sold },
          ...w,
        ])
      }
    }

    setShowSaleModal(false)
    setModalItem(null)
  }

  if (loading) return <div>Loading…</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6">
          <StockTable items={stockItems} onSell={onSellStock} />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <SoldTable items={soldItems} />
        </div>
      </div>
      <InAsteptareTable items={waitItems} onSell={onSellPending} />
      {showSaleModal && modalItem && (
        <SaleModal
          item={modalItem}
          context={modalCtx}
          onConfirm={handleSaleConfirm}
          onCancel={() => setShowSaleModal(false)}
        />
      )}
    </div>
  )
}
