import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/AdminLayout'

const COMBO_DEALS = [
  { key: 'combo_10_small_10_large', label: '10 Small + 10 Large', price: 11500, quantity: 20, badge: 'MOST POPULAR' },
  { key: 'combo_5_small_5_large', label: '5 Small + 5 Large', price: 6500, quantity: 10 },
]

const PRICING = {
  small: {
    label: 'Small (3 inch)',
    quantities: {
      5: 2500,
      10: 4000,
      20: 7000,
    },
  },
  large: {
    label: 'Large (6 inch)',
    quantities: {
      5: 4000,
      10: 7500,
      20: 13000,
    },
  },
}

const DELIVERY = {
  halfWayTree: { label: 'Half Way Tree Area', fee: 0 },
  crossRoads: { label: 'Cross Roads Area', fee: 0 },
  newKingston: { label: 'New Kingston Area', fee: 0 },
  constantSpring: { label: 'Constant Spring Area', fee: 700 },
  portmore: { label: 'Portmore', fee: 1000 },
  knutsford: { label: 'Knutsford Express Pickup', fee: 300 },
}

function formatCurrency(value) {
  return `JMD ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getMonthLabel(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getWeekLabel(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function computeOrderFinancials(order) {
  const revenue = Number(order.revenue || order.total || 0)
  const rawMaterial = Number(order.raw_material_cost || 0)
  const labor = Number(order.labor_cost || 0)
  const other = Number(order.other_expenses || 0)
  const expenses = Number(order.expenses || rawMaterial + labor + other)
  const profit = Number(order.profit || revenue - expenses)
  return { revenue, expenses, profit, rawMaterial, labor, other }
}

function calculateTotals(order) {
  const deal = order.deal ? COMBO_DEALS.find((combo) => combo.key === order.deal) : null
  const quantity = deal ? deal.quantity : Math.max(5, Number(order.quantity || 5))

  if (deal) {
    const rushMultiplier = order.rush_order ? 1.5 : 1
    const deliveryFee = DELIVERY[order.delivery_area]?.fee ?? 0
    const subtotal = Math.round(deal.price * rushMultiplier)
    return { subtotal, deliveryFee, total: Math.round(subtotal + deliveryFee), quantity }
  }

  const sizeData = PRICING[order.size] || PRICING.small
  const exactPrice = sizeData.quantities[quantity]

  let subtotal = exactPrice ?? (() => {
    if (quantity >= 20) {
      return sizeData.quantities[20] + (quantity - 20) * Math.round(sizeData.quantities[20] / 20)
    }
    if (quantity >= 10) {
      return sizeData.quantities[10] + (quantity - 10) * Math.round(sizeData.quantities[10] / 10)
    }
    return sizeData.quantities[5] + (quantity - 5) * Math.round(sizeData.quantities[5] / 5)
  })()

  const rushMultiplier = order.rush_order ? 1.5 : 1
  const deliveryFee = DELIVERY[order.delivery_area]?.fee ?? 0
  const total = Math.round(subtotal * rushMultiplier) + deliveryFee
  return { subtotal: Math.round(subtotal * rushMultiplier), deliveryFee, total }
}

export default function AdminDashboard() {
  const { user } = useUser()
  const [orders, setOrders] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newOrder, setNewOrder] = useState({
    business_name: '',
    phone: '',
    email: '',
    size: 'small',
    color: 'black',
    quantity: 5,
    delivery_area: 'halfWayTree',
    rush_order: false,
    status: 'pending',
    notes: '',
    deal: '',
    logo_work_charge: 0,
  })
  const [rawMaterials, setRawMaterials] = useState([
    { material: '', cost: 0 },
  ])

  useEffect(() => {
    if (!user) return
    verifyAdminAccess()
  }, [user])

  async function verifyAdminAccess() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/verify-admin')
      const payload = await response.json()

      if (!response.ok || !payload?.isAdmin) {
        toast.error('Access denied: Admin only')
        setIsAdmin(false)
        window.location.href = '/'
        return
      }

      setIsAdmin(true)
      await loadOrders()
    } catch (err) {
      console.error('Admin verify failed', err)
      setError('Unable to verify admin access')
    } finally {
      setLoading(false)
    }
  }

  async function loadOrders() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/htv-orders')
      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load orders')
      }

      setOrders(payload.orders || [])
    } catch (err) {
      console.error('HTV orders load failed', err)
      setError('Unable to load orders. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const monthOptions = useMemo(() => {
    const months = new Set()
    orders.forEach(order => {
      if (order.order_month) {
        months.add(getMonthLabel(order.order_month))
      }
    })

    return ['All months', ...Array.from(months).sort((a, b) => {
      const aDate = new Date(a)
      const bDate = new Date(b)
      return bDate - aDate
    })]
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (selectedMonth === 'all') return orders
    return orders.filter(order => getMonthLabel(order.order_month) === selectedMonth)
  }, [orders, selectedMonth])

  const summary = useMemo(() => {
    const totals = { revenue: 0, expenses: 0, profit: 0 }
    filteredOrders.forEach(order => {
      const { revenue, expenses, profit } = computeOrderFinancials(order)
      totals.revenue += revenue
      totals.expenses += expenses
      totals.profit += profit
    })
    return totals
  }, [filteredOrders])

  const weeklyData = useMemo(() => {
    const weekMap = new Map()

    filteredOrders.forEach(order => {
      const weekKey = order.order_week || order.created_at
      if (!weekKey) return

      const existing = weekMap.get(weekKey) || { revenue: 0, expenses: 0, profit: 0, orders: 0 }
      const { revenue, expenses, profit } = computeOrderFinancials(order)

      weekMap.set(weekKey, {
        revenue: existing.revenue + revenue,
        expenses: existing.expenses + expenses,
        profit: existing.profit + profit,
        orders: existing.orders + 1,
      })
    })

    return Array.from(weekMap.entries())
      .map(([week, totals]) => ({ week, ...totals }))
      .sort((a, b) => new Date(a.week) - new Date(b.week))
  }, [filteredOrders])

  const maxRevenue = Math.max(...weeklyData.map(item => item.revenue), 1)

  const selectedTotals = calculateTotals(newOrder)
  const rawMaterialCost = rawMaterials.reduce((sum, item) => sum + Number(item.cost || 0), 0)
  const logoWorkCharge = Number(newOrder.logo_work_charge || 0)
  const totalRevenue = selectedTotals.total + logoWorkCharge
  const expenseTotal = rawMaterialCost
  const profitTotal = totalRevenue - expenseTotal

  const handleRawMaterialChange = (index, field, value) => {
    setRawMaterials((prev) => prev.map((item, idx) => idx === index ? { ...item, [field]: field === 'cost' ? Number(value || 0) : value } : item))
  }

  const addRawMaterialRow = () => {
    setRawMaterials((prev) => [...prev, { material: '', cost: 0 }])
  }

  const removeRawMaterialRow = (index) => {
    setRawMaterials((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleCreateOrder = async (event) => {
    event.preventDefault()

    if (!newOrder.business_name || !newOrder.phone) {
      toast.error('Business name and phone are required')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/admin/htv-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: newOrder.business_name,
          phone: newOrder.phone,
          email: newOrder.email || null,
          size: newOrder.size,
          color: newOrder.color,
          quantity: Number(newOrder.quantity || 1),
          delivery_area: newOrder.delivery_area,
          rush_order: Boolean(newOrder.rush_order),
          logo_url: 'manual-entry',
          logo_filename: 'manual-entry',
          subtotal: selectedTotals.subtotal,
          delivery_fee: selectedTotals.deliveryFee,
          total: totalRevenue,
          raw_materials: rawMaterials.filter((item) => item.material.trim()),
          raw_material_cost: rawMaterialCost,
          labor_cost: 0,
          other_expenses: 0,
          revenue: totalRevenue,
          expenses: expenseTotal,
          profit: profitTotal,
          status: newOrder.status,
          notes: newOrder.notes || null,
        }),
      })

      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create order')
      }

      setOrders((prev) => [payload.order, ...prev])
      setNewOrder({
        business_name: '',
        phone: '',
        email: '',
        size: 'small',
        color: 'black',
        quantity: 5,
        delivery_area: 'halfWayTree',
        rush_order: false,
        status: 'pending',
        notes: '',
        logo_work_charge: 0,
      })
      setRawMaterials([{ material: '', cost: 0 }])
      toast.success('HTV order created successfully')
    } catch (err) {
      console.error('Create order failed', err)
      toast.error(err.message || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAdmin && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-gray-600">Loading admin access...</div>
      </div>
    )
  }

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Access denied</h1>
          <p className="text-gray-600">Admin access is required to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>HTV Admin Dashboard</title>
        <meta name="description" content="HTV admin dashboard with weekly revenue, expenses, profit, and order entry." />
      </Head>

      <div className="min-h-screen bg-white text-black">
        <AdminLayout />

        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-accent">HTV orders</p>
              <h1 className="mt-3 text-3xl font-black text-black sm:text-4xl">Weekly revenue, expenses & profit</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                Track and create HTV orders from the admin dashboard. Use the form below to enter orders manually.
              </p>
            </div>

            <div className="rounded-3xl bg-gray-100 p-4 text-sm text-gray-700">
              Orders displayed: <span className="font-bold text-black">{filteredOrders.length}</span>
            </div>
          </div>

          <section className="mb-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-black">Add manual HTV order</h2>
                <p className="mt-2 text-sm text-gray-600">Enter order details, raw material costs, and create a new order in the database.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-3xl bg-gray-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">COMBO DEALS (BEST VALUE)</p>
                <p className="mt-2 text-sm text-gray-600">Best for businesses & bulk orders</p>
                <div className="mt-4 space-y-3">
                  {COMBO_DEALS.map((combo) => (
                    <button
                      key={combo.key}
                      type="button"
                      onClick={() => setNewOrder({
                        ...newOrder,
                        deal: combo.key,
                        quantity: combo.quantity,
                        size: newOrder.size,
                      })}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${newOrder.deal === combo.key ? 'border-accent bg-accent/10' : 'border-gray-200 bg-white hover:border-accent/70 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-black">{combo.label}</div>
                          <div className="mt-1 text-2xl font-black text-black">JMD {combo.price.toLocaleString()}</div>
                        </div>
                        {combo.badge ? <div className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">{combo.badge}</div> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-gray-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">SINGLE SIZE PRICING</p>
                <div className="mt-4 space-y-4 text-sm text-black">
                  {Object.entries(PRICING).map(([key, data]) => (
                    <div key={key} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="font-semibold">{data.label}</div>
                      <div className="mt-2 space-y-2">
                        {Object.entries(data.quantities).map(([qty, price]) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => setNewOrder({
                              ...newOrder,
                              deal: '',
                              size: key,
                              quantity: Number(qty),
                            })}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${newOrder.deal === '' && newOrder.size === key && newOrder.quantity === Number(qty) ? 'border-accent bg-accent/10 text-black' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-accent/70 hover:bg-gray-50'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{qty} — JMD {price.toLocaleString()}</span>
                              {newOrder.deal === '' && newOrder.size === key && newOrder.quantity === Number(qty) ? <span className="text-accent">Selected</span> : null}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateOrder} className="mt-8 grid gap-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-900">Business name</label>
                  <input
                    value={newOrder.business_name}
                    onChange={(e) => setNewOrder({ ...newOrder, business_name: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black focus:border-accent focus:outline-none"
                    placeholder="Business name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900">Phone</label>
                  <input
                    value={newOrder.phone}
                    onChange={(e) => setNewOrder({ ...newOrder, phone: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black focus:border-accent focus:outline-none"
                    placeholder="876-xxx-xxxx"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900">Email</label>
                  <input
                    type="email"
                    value={newOrder.email}
                    onChange={(e) => setNewOrder({ ...newOrder, email: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black focus:border-accent focus:outline-none"
                    placeholder="optional@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900">Size</label>
                  <select
                    value={newOrder.size}
                    onChange={(e) => setNewOrder({ ...newOrder, size: e.target.value })}
                    disabled={Boolean(newOrder.deal)}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    {Object.entries(PRICING).map(([key, data]) => (
                      <option key={key} value={key}>
                        {data.label} — from JMD {data.quantities[5].toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {newOrder.deal ? <p className="mt-2 text-xs text-gray-500">Using selected combo deal — size is fixed by deal.</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900">Color</label>
                  <select
                    value={newOrder.color}
                    onChange={(e) => setNewOrder({ ...newOrder, color: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black focus:border-accent focus:outline-none"
                  >
                    <option value="black">Black</option>
                    <option value="white">White</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900">Quantity (min 5)</label>
                  <input
                    type="number"
                    min="5"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity: Math.max(5, Number(e.target.value) || 5), deal: '' })}
                    disabled={Boolean(newOrder.deal)}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                  />
                  {newOrder.deal ? <p className="mt-2 text-xs text-gray-500">Quantity fixed by selected combo deal.</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900">Delivery area</label>
                  <select
                    value={newOrder.delivery_area}
                    onChange={(e) => setNewOrder({ ...newOrder, delivery_area: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black focus:border-accent focus:outline-none"
                  >
                    {Object.entries(DELIVERY).map(([key, data]) => (
                      <option key={key} value={key}>
                        {data.label} — JMD {data.fee}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3 items-end">
                <div className="flex items-center gap-3">
                  <input
                    id="rushOrder"
                    type="checkbox"
                    checked={newOrder.rush_order}
                    onChange={(e) => setNewOrder({ ...newOrder, rush_order: e.target.checked })}
                    className="h-5 w-5 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <label htmlFor="rushOrder" className="text-sm font-medium text-gray-900">Rush Order (+50%)</label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900">Status</label>
                  <select
                    value={newOrder.status}
                    onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black focus:border-accent focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900">Notes</label>
                  <input
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black focus:border-accent focus:outline-none"
                    placeholder="Optional internal note"
                  />
                </div>
              </div>

              <div className="rounded-3xl bg-gray-50 p-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Subtotal</p>
                    <p className="mt-3 text-2xl font-black text-black">{formatCurrency(selectedTotals.subtotal)}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Delivery</p>
                    <p className="mt-3 text-2xl font-black text-black">{formatCurrency(selectedTotals.deliveryFee)}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Total revenue</p>
                    <p className="mt-3 text-2xl font-black text-black">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-gray-50 p-5">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-gray-900">Additional logo work charge</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={newOrder.logo_work_charge}
                      onChange={(e) => setNewOrder({ ...newOrder, logo_work_charge: Number(e.target.value || 0) })}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black focus:border-accent focus:outline-none"
                      placeholder="JMD 0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">Logo work fee</label>
                    <p className="mt-2 text-sm text-gray-600">Use this for additional design, prep, or custom setup charges.</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Total expense</span>
                    <span className="font-semibold text-black">{formatCurrency(expenseTotal)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                    <span>Estimated profit</span>
                    <span className="font-semibold text-black">{formatCurrency(profitTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-gray-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Raw materials</p>
                    <p className="text-sm text-gray-600">Enter each material and its cost.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addRawMaterialRow}
                    className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
                  >
                    Add material
                  </button>
                </div>
                <div className="space-y-4">
                  {rawMaterials.map((item, index) => (
                    <div key={index} className="grid gap-4 lg:grid-cols-[2fr_1fr_auto]">
                      <input
                        value={item.material}
                        onChange={(e) => handleRawMaterialChange(index, 'material', e.target.value)}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-black focus:border-accent focus:outline-none"
                        placeholder="Material name"
                      />
                      <input
                        type="number"
                        min="0"
                        value={item.cost}
                        onChange={(e) => handleRawMaterialChange(index, 'cost', e.target.value)}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-black focus:border-accent focus:outline-none"
                        placeholder="Cost"
                      />
                      <button
                        type="button"
                        onClick={() => removeRawMaterialRow(index)}
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-3xl bg-accent px-6 py-4 text-base font-bold text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving order...' : 'Create order'}
              </button>
            </form>
          </section>

          {loading ? (
            <div className="rounded-3xl bg-gray-100 p-10 text-center text-gray-600">Loading orders...</div>
          ) : error ? (
            <div className="rounded-3xl bg-red-50 p-10 text-center text-red-700">{error}</div>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-3xl bg-gray-100 p-6">
                  <div className="text-sm uppercase tracking-[0.3em] text-gray-500">Revenue</div>
                  <div className="mt-4 text-3xl font-black text-black">{formatCurrency(summary.revenue)}</div>
                  <div className="mt-2 text-sm text-gray-600">Total collected from orders</div>
                </div>

                <div className="rounded-3xl bg-gray-100 p-6">
                  <div className="text-sm uppercase tracking-[0.3em] text-gray-500">Expenses</div>
                  <div className="mt-4 text-3xl font-black text-black">{formatCurrency(summary.expenses)}</div>
                  <div className="mt-2 text-sm text-gray-600">Raw materials, labour, and extra costs</div>
                </div>

                <div className="rounded-3xl bg-gray-100 p-6">
                  <div className="text-sm uppercase tracking-[0.3em] text-gray-500">Profit</div>
                  <div className="mt-4 text-3xl font-black text-black">{formatCurrency(summary.profit)}</div>
                  <div className="mt-2 text-sm text-gray-600">Revenue minus expenses</div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-black">Filter orders by month</h2>
                  <p className="text-sm text-gray-600">Select a month to view weekly revenue, expenses and profit.</p>
                </div>
                <div className="w-full max-w-sm">
                  <label className="sr-only" htmlFor="monthFilter">Month</label>
                  <select
                    id="monthFilter"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-black focus:border-accent focus:outline-none"
                  >
                    {monthOptions.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>

              <section className="mt-10 rounded-3xl bg-gray-50 
              p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-black">Weekly performance</h2>
                    <p className="mt-2 text-sm text-gray-600">Revenue and profit for each week in the selected month.</p>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {weeklyData.length === 0 ? (
                    <div className="rounded-3xl bg-white p-6 text-center text-gray-600">No weekly data available.</div>
                  ) : (
                    weeklyData.map((item) => (
                      <div key={item.week} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm uppercase tracking-[0.3em] text-gray-500">{getWeekLabel(item.week)}</div>
                            <div className="mt-2 text-lg font-bold text-black">{item.orders} orders</div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl bg-gray-100 p-4">
                              <div className="text-xs uppercase text-gray-500">Revenue</div>
                              <div className="mt-2 text-lg font-bold text-black">{formatCurrency(item.revenue)}</div>
                            </div>
                            <div className="rounded-2xl bg-gray-100 p-4">
                              <div className="text-xs uppercase text-gray-500">Expenses</div>
                              <div className="mt-2 text-lg font-bold text-black">{formatCurrency(item.expenses)}</div>
                            </div>
                            <div className="rounded-2xl bg-gray-100 p-4">
                              <div className="text-xs uppercase text-gray-500">Profit</div>
                              <div className="mt-2 text-lg font-bold text-black">{formatCurrency(item.profit)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 h-4 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${Math.min(100, (item.revenue / maxRevenue) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-black">Orders</h2>
                    <p className="mt-2 text-sm text-gray-600">View each order with raw material usage, cost, and margin details.</p>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                    <thead className="bg-gray-100 text-xs uppercase tracking-[0.2em] text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Materials</th>
                        <th className="px-4 py-3">Costs</th>
                        <th className="px-4 py-3">Revenue</th>
                        <th className="px-4 py-3">Profit</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredOrders.map((order) => {
                        const { revenue, expenses, profit, rawMaterial, labor, other } = computeOrderFinancials(order)
                        const materialLabel = Array.isArray(order.raw_materials) && order.raw_materials.length > 0
                          ? order.raw_materials.map((item) => `${item.name || item.material} (${formatCurrency(item.cost || item.price || 0)})`).join(', ')
                          : 'Not set'

                        return (
                          <tr key={order.id} className="bg-white">
                            <td className="px-4 py-4 align-top text-xs text-gray-600">{new Date(order.created_at).toLocaleDateString('en-US')}</td>
                            <td className="px-4 py-4 align-top text-sm font-semibold text-black">{order.business_name}</td>
                            <td className="px-4 py-4 align-top text-sm text-gray-600">{order.quantity}</td>
                            <td className="px-4 py-4 align-top text-sm text-black">{formatCurrency(order.total)}</td>
                            <td className="px-4 py-4 align-top text-sm text-gray-600 max-w-xs break-words">{materialLabel}</td>
                            <td className="px-4 py-4 align-top text-sm text-gray-600">
                              <div>Material: {formatCurrency(rawMaterial)}</div>
                              <div>Labor: {formatCurrency(labor)}</div>
                              <div>Other: {formatCurrency(other)}</div>
                              <div className="mt-1 font-semibold text-black">Total: {formatCurrency(expenses)}</div>
                            </td>
                            <td className="px-4 py-4 align-top text-sm text-black">{formatCurrency(revenue)}</td>
                            <td className="px-4 py-4 align-top text-sm text-black">{formatCurrency(profit)}</td>
                            <td className="px-4 py-4 align-top text-sm text-gray-600">{order.status || 'pending'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  )
}
