// src/components/Analytics.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { supabase } from '../lib/supabase'
import { SoldItem, StockItem } from '../types'
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Clock,
  Package,
} from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

type Period = 'day' | 'week' | 'month' | 'year'

// Helper: ISO‑week key like "2025-W29"
function isoWeekKey(d: Date) {
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  // Thursday in current week decides the year.
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7))
  const firstThu = new Date(target.getFullYear(), 0, 4)
  const dayDiff =
    (target.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)
  const weekNum = 1 + Math.round(dayDiff / 7)
  return `${target.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

// Day names
const DAYS = ['Duminică','Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă']
// Month names
const MONTHS = [
  'Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec'
]

export default function Analytics() {
  const [stockItems, setStock] = useState<StockItem[]>([])
  const [soldItems,  setSales] = useState<SoldItem[]>([])
  const [loading,    setLoading] = useState(true)
  const [period,     setPeriod]  = useState<Period>('day')
// NEW: fetch factura records so we can get pret_vanzare_factura
  const [facturaItems, setFactura] = useState<{
    stock_item_id: number
    product_name: string
    pret_vanzare_factura: number
    created_at: string
  }[]>([])


  // fetch + realtime subscribe
  useEffect(() => {
    supabase.from('stock_items').select('*')
      .then(r => r.data && setStock(r.data as StockItem[]))
    supabase.from('sold_items').select('*')
      .then(r => {
        if (r.data) {
        console.log('⛳ soldItems payload:', r.data)
        setSales(r.data as SoldItem[])
      }
        setLoading(false)
      })

      // NEW: load factura table
    supabase
      .from('sold_factura')
      .select('*')
      .then(r => r.data && setFactura(r.data))

    const channel = supabase
      .channel('analytics-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sold_items' },
        (payload) => {
          const row = payload.new as SoldItem
          setSales(prev => {
            if (payload.eventType === 'DELETE') {
              return prev.filter(i => i.id !== payload.old.id)
            }
            const idx = prev.findIndex(i => i.id === row.id)
            if (idx >= 0) {
              const copy = [...prev]
              copy[idx] = row
              return copy
            }
            return [row, ...prev]
          })
        }
      )
      .subscribe()

    return () => {
      // always unsubscribe the channel
      channel.unsubscribe()
    }
  }, [])

  const analytics = useMemo(() => {
    // 1) determine start of period
    const now = new Date()
    let periodStart: Date
    switch (period) {
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week': {
        // week starts Monday
        const dayIdx = (now.getDay() + 6) % 7
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayIdx)
        break
      }
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        periodStart = new Date(now.getFullYear(), 0, 1)
        break
    }

    // 2) filter soldItems to current period
    const filtered = soldItems.filter(i => {
      const d = new Date(i.sold_date)
      return d >= periodStart
    })

    // 3) common aggregates
    const totalStockValue = stockItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const totalSales      = filtered.reduce((s, i) => s + i.total_value, 0)
    const totalTx         = filtered.length
    const avgSale         = totalTx ? totalSales / totalTx : 0
    const lowStock        = stockItems.filter(i => i.quantity < 5).length

    // cost lookup by stock_item_id
    const costMap = Object.fromEntries(stockItems.map(i => [i.id, i.unit_price]))

    // 4) total profit in this period
    const totalProfit = filtered.reduce((sum, i) => {
      const cost = costMap[i.stock_item_id] || 0
      return sum + (i.total_value - cost * i.quantity_sold)
    }, 0)

    // 5) top5 produse (by qty sold)
    const byName: Record<string, { name: string; qty: number; rev: number }> = {}
    filtered.forEach(i => {
      if (!i.name) return
      if (!byName[i.name]) byName[i.name] = { name: i.name, qty: 0, rev: 0 }
      byName[i.name].qty += i.quantity_sold
      byName[i.name].rev += i.total_value
    })
    const top5 = Object.values(byName)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

    // 6) sales by source
    const bySource: Record<string, number> = {}
    filtered.forEach(i => {
      const src = i.sursa || 'Altă sursă'
      bySource[src] = (bySource[src] || 0) + i.quantity_sold
    })
    const salesBySource = Object.entries(bySource).map(([sursa, qty]) => ({ sursa, qty }))

    // helper to format the period buckets:
    let salesOverTime: { date: string; sales: number }[] = []
    let profitOverTime: { date: string; profit: number }[] = []
    let txOverTime: { date: string; count: number }[] = []

    if (period === 'day') {
      // single point: today
      const todayKey = periodStart.toLocaleDateString()
      salesOverTime = [ { date: todayKey, sales: totalSales } ]
      profitOverTime = [ { date: todayKey, profit: totalProfit } ]
      txOverTime = [ { date: todayKey, count: totalTx } ]

    } else if (period === 'week') {
      // one bucket per day Mon→Sun
      const buckets = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(periodStart)
        d.setDate(d.getDate() + i)
        const key = d.toISOString().slice(0, 10)
        return { key, label: DAYS[d.getDay()] }
      })

      // group
      const salesMap: Record<string, number> = {}
      const profitMap: Record<string, number> = {}
      const txMap: Record<string, number> = {}

      filtered.forEach(i => {
        const day = i.sold_date.slice(0,10)
        salesMap[day] = (salesMap[day] || 0) + i.total_value
        const cost = costMap[i.stock_item_id] || 0
        profitMap[day] = (profitMap[day] || 0) + (i.total_value - cost * i.quantity_sold)
        txMap[day] = (txMap[day] || 0) + 1
      })

      salesOverTime = buckets.map(b => ({
        date:  b.label,
        sales: salesMap[b.key] || 0
      }))
      profitOverTime = buckets.map(b => ({
        date:   b.label,
        profit: profitMap[b.key] || 0
      }))
      txOverTime = buckets.map(b => ({
        date:  b.label,
        count: txMap[b.key] || 0
      }))

    } else if (period === 'month') {
      // group by ISO‑week
      const weekKeys = Array.from(new Set(
        filtered.map(i => isoWeekKey(new Date(i.sold_date)))
      )).sort()

      salesOverTime = weekKeys.map(w => ({
        date:  w.split('-W')[1],       // show only week number
        sales: filtered
                 .filter(i => isoWeekKey(new Date(i.sold_date)) === w)
                 .reduce((s,i)=>s+i.total_value,0)
      }))
      profitOverTime = weekKeys.map(w => ({
        date:   w.split('-W')[1],
        profit: filtered
                  .filter(i => isoWeekKey(new Date(i.sold_date)) === w)
                  .reduce((s,i)=>{
                    const c = costMap[i.stock_item_id]||0
                    return s + (i.total_value - c*i.quantity_sold)
                  },0)
      }))
      txOverTime = weekKeys.map(w => ({
        date:  w.split('-W')[1],
        count: filtered.filter(i => isoWeekKey(new Date(i.sold_date))===w).length
      }))

    } else /* year */ {
      // group by month
      const monthKeys = Array.from({ length: 12 }).map((_,m) => {
        const key = `${periodStart.getFullYear()}-${String(m+1).padStart(2,'0')}`
        return { key, label: MONTHS[m] }
      })

      // maps
      const salesMap: Record<string,number> = {}
      const profitMap: Record<string,number> = {}
      const txMap: Record<string,number> = {}

      filtered.forEach(i => {
        const m = i.sold_date.slice(0,7)
        salesMap[m] = (salesMap[m]||0) + i.total_value
        const c = costMap[i.stock_item_id]||0
        profitMap[m] = (profitMap[m]||0)
          + (i.total_value - c*i.quantity_sold)
        txMap[m] = (txMap[m]||0) + 1
      })

      salesOverTime = monthKeys.map(mk => ({
        date:  mk.label,
        sales: salesMap[mk.key] || 0
      }))
      profitOverTime = monthKeys.map(mk => ({
        date:   mk.label,
        profit: profitMap[mk.key]||0
      }))
      txOverTime = monthKeys.map(mk => ({
        date:  mk.label,
        count: txMap[mk.key]||0
      }))
    }

    return {
      totalStockValue,
      totalSales,
      totalTx,
      avgSale,
      lowStock,
      top5,
      salesBySource,
      salesOverTime,
      profitOverTime,
      transactionsOverTime: txOverTime,
      totalProfit,
    }
  }, [stockItems, soldItems, facturaItems, period])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600" />
      </div>
    )
  }

  const {
    totalStockValue,
    totalSales,
    totalTx,
    avgSale,
    lowStock,
    top5,
    salesBySource,
    salesOverTime,
    profitOverTime,
    transactionsOverTime,
    totalProfit,
  } = analytics


  // Compute rows for the new table, applying same period filter:
  const periodStart = (() => {
    const now = new Date()
    switch (period) {
      case 'day':   return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      case 'week': {
        const dayIdx = (now.getDay() + 6) % 7
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayIdx)
      }
      case 'month': return new Date(now.getFullYear(), now.getMonth(), 1)
      case 'year':  return new Date(now.getFullYear(), 0, 1)
    }
  })()

  const filteredFactura = facturaItems.filter(f => {
    return new Date(f.created_at) >= periodStart
  })

function sameDay(a: string, b: string) {
  const da = new Date(a), db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth()    === db.getMonth() &&
    da.getDate()     === db.getDate()
  )
}

// inside Analytics.tsx, after you build filteredFactura…

const tableRows = filteredFactura.map(f => {
  const idStr = String(f.stock_item_id)  // turn number → string

  // 1) find by exact stock_item_id
  let sold = soldItems.find(s => s.stock_item_id === idStr)

  // 2) fallback by date + id if needed
  if (!sold) {
    sold = soldItems.find(s =>
      s.stock_item_id === idStr &&
      sameDay(s.sold_date, f.created_at)
    )
  }

  return {
    name:   f.product_name,
    date:   new Date(f.created_at).toLocaleDateString(),
    price:  f.pret_vanzare_factura.toFixed(2),
    source: sold?.sursa ?? '—',
  }
})





// 1) your existing helpers:

// format a Date as "DD.MM"
function formatDM(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}`
}

// build the filename/label pieces
function getRangeLabel(period: Period): string {
  const now = new Date()

  switch (period) {
    case 'day':
      return formatDM(now)
    case 'week': {
      const dayIdx = (now.getDay() + 6) % 7
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayIdx)
      const end   = new Date(start)
      end.setDate(start.getDate() + 6)
      return `${formatDM(start)} - ${formatDM(end)}`
    }
    case 'month':
      // just the month number
      return String(now.getMonth() + 1).padStart(2, '0')
    case 'year':
      return String(now.getFullYear())
  }
}

// 2) new helper for the PDF title:
function getReportTitle(period: Period): string {
  const label = getRangeLabel(period)
  return `Raport Vânzari produse ${label}`
}

// 3) your exportPDF, updated:
function exportPDF() {
  const doc = new jsPDF()
  // use our new title
  doc.text(getReportTitle(period), 14, 20)

  autoTable(doc, {
    startY: 30,
    head: [['Produs', 'Data', 'Pret(€)', 'Sursa']],
    body: tableRows.map(r => [r.name, r.date, r.price, r.source]),
  })

  // and your filename can remain as before
  const label = getRangeLabel(period).replace(/ /g, '_').replace(/\./g,'-')
  doc.save(`vanzari_produse_${period}_${label}.pdf`)
}



  return (
    <div className="space-y-8">
      {/* Period selector */}
      <div className="flex space-x-2">
        {(['day','week','month','year'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`
              px-3 py-1 rounded
              ${period===p ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}
            `}
          >
            {{day:'Zi',week:'Săpt.',month:'Lună',year:'An'}[p]}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
        <KPI title="Total vânzări"  value={`€ ${totalSales.toFixed(2)}`}   icon={<DollarSign />} />
        <KPI title="Valoare stoc"   value={`€ ${totalStockValue.toFixed(2)}`} icon={<Package />} />
        <KPI title="Tranzacții"     value={`${totalTx}`}                   icon={<ShoppingCart />} />
        <KPI title="Medie tranz."   value={`€ ${avgSale.toFixed(2)}`}     icon={<TrendingUp />} />
        <KPI title="Low stock (<5)" value={`${lowStock}`}                 icon={<Clock />} />
        <KPI title="Profit total"   value={`€ ${totalProfit.toFixed(2)}`} icon={<DollarSign />} />
      </div>

      {/* three small charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartSection title="Vânzări în timp">
          <div className="h-56">
            <Line
              data={{
                labels:   salesOverTime.map(r => r.date),
                datasets: [{
                  label:           '€ Vânzări',
                  data:            salesOverTime.map(r => r.sales),
                  borderColor:     '#3B82F6',
                  backgroundColor: 'rgba(59,130,246,0.3)',
                  fill:            true,
                }],
              }}
              options={{
                responsive:          true,
                maintainAspectRatio: false,
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: '#e5e7eb' } },
                },
              }}
            />
          </div>
        </ChartSection>

        <ChartSection title="Vânzări după sursă (bucăți)">
          <div className="h-56">
            <Doughnut
              data={{
                labels:   salesBySource.map(s => s.sursa),
                datasets: [{
                  data:            salesBySource.map(s => s.qty),
                  backgroundColor: ['#3B82F6','#EF4444','#F59E0B','#10B981','#8B5CF6','#F472B6'],
                }],
              }}
              options={{
                responsive:          true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'right', labels: { boxWidth:12, font:{size:12} } },
                  tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed} bucăți` } }
                }
              }}
            />
          </div>
        </ChartSection>

        <ChartSection title="Tranzacții în timp">
          <div className="h-56">
            <Bar
              data={{
                labels:   transactionsOverTime.map(r => r.date),
                datasets: [{
                  label:           'Număr tranzacții',
                  data:            transactionsOverTime.map(r => r.count),
                  backgroundColor: '#10B981',
                }],
              }}
              options={{
                responsive:          true,
                maintainAspectRatio: false,
                plugins:            { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: '#e5e7eb' } },
                },
              }}
            />
          </div>
        </ChartSection>
      </div>

      {/* profit + top 5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartSection title="Profit în timp">
          <div className="h-56">
            <Line
              data={{
                labels:   profitOverTime.map(r => r.date),
                datasets: [{
                  label:           '€ Profit',
                  data:            profitOverTime.map(r => r.profit),
                  borderColor:     '#EF4444',
                  backgroundColor: 'rgba(239,68,68,0.2)',
                  fill:            true,
                }],
              }}
              options={{
                responsive:          true,
                maintainAspectRatio: false,
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: '#e5e7eb' } },
                },
              }}
            />
          </div>
        </ChartSection>

        <ChartSection title="Top 5 produse">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-4 text-left">Produs</th>
                <th className="p-4 text-right">Cantitate</th>
                <th className="p-4 text-right">Venit</th>
              </tr>
            </thead>
            <tbody>
              {top5.map((it, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="p-4">{it.name}</td>
                  <td className="p-4 text-right">{it.qty}</td>
                  <td className="p-4 text-right">€ {it.rev.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartSection>
      </div>

      {/* ─── Sold Products Table ─────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Produse Vândute</h3>
          <button
            onClick={exportPDF}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            Exportă PDF
          </button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Produs</th>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-right">Preț (€)</th>
                <th className="p-2 text-left">Sursă</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.date}</td>
                  <td className="p-2 text-right">{r.price}</td>
                  <td className="p-2">{r.source}</td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    Nicio vânzare în această perioadă.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KPI({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white p-4 rounded shadow flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
      <div className="text-blue-600">{icon}</div>
    </div>
  )
}

function ChartSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {children}
    </div>
  )
}
