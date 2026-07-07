import { useEffect, useMemo, useState, useRef } from 'react'
import Head from 'next/head'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/AdminLayout'
import ImageEditModal from '../../components/ImageEditModal'
import HtvInvoice from '../../components/HtvInvoice'
import { ChevronDown, ChevronUp, Sparkles, Edit, Trash2, FileText, Download, Camera, Loader, X, Eye } from 'lucide-react'
import { generateInvoicePDF, generateInvoicePNG } from '../../lib/invoiceGenerator'

const COMBO_DEALS = [
  { key: 'combo_10_small_10_large', label: '10 Small + 10 Large', price: 12650, quantity: 20, badge: 'MOST POPULAR' },
  { key: 'combo_5_small_5_large', label: '5 Small + 5 Large', price: 7150, quantity: 10 },
  { key: 'combo_10_small_10_large_5_xtra_large', label: '10 Small + 10 Large + 5 Xtra Large', price: 19800, quantity: 25, badge: 'BEST FOR MIXED ORDERS' },
]

const PRICING = {
  small: {
    label: 'Small (3 inch)',
    quantities: {
      5: 2750,
      10: 4400,
      20: 7700,
    },
  },
  large: {
    label: 'Large (6 inch)',
    quantities: {
      5: 4400,
      10: 8250,
      20: 14300,
    },
  },
  xtraLarge: {
    label: 'Xtra Large (10 inch)',
    quantities: {
      5: 7150,
      10: 13750,
      20: 25300,
    },
  },
}

const DELIVERY = {
  halfWayTree: { label: 'Half Way Tree Area', fee: 0 },
  crossRoads: { label: 'Cross Roads Area', fee: 0 },
  newKingston: { label: 'New Kingston Area', fee: 0 },
  constantSpring: { label: 'Constant Spring Area', fee: 0 },
  portmore: { label: 'Portmore', fee: 0 },
  knutsford: { label: 'Knutsford Express Pickup', fee: 0 },
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
  const invoiceRef = useRef(null)
  const [orders, setOrders] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isImageEditOpen, setIsImageEditOpen] = useState(false)
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [editOrder, setEditOrder] = useState(null)
  const [editRawMaterials, setEditRawMaterials] = useState([])
  const [invoiceOrderId, setInvoiceOrderId] = useState(null)
  const [viewingLogoOrderId, setViewingLogoOrderId] = useState(null)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
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

    return ['all', ...Array.from(months).sort((a, b) => {
      if (a === 'all') return -1
      if (b === 'all') return 1
      const aDate = new Date(a)
      const bDate = new Date(b)
      return bDate - aDate
    })]
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (selectedMonth === 'all') return orders
    return orders.filter(order => order.order_month && getMonthLabel(order.order_month) === selectedMonth)
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
          labor_cost: logoWorkCharge,
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

  const handleEditOrder = (order) => {
    setEditingOrderId(order.id)
    setEditOrder({
      ...order,
      rush_order: Boolean(order.rush_order),
    })
    setEditRawMaterials(Array.isArray(order.raw_materials) ? order.raw_materials : [])
  }

  const handleCancelEdit = () => {
    setEditingOrderId(null)
    setEditOrder(null)
    setEditRawMaterials([])
  }

  const handleUpdateOrder = async (event) => {
    event.preventDefault()

    if (!editOrder || !editingOrderId) return
    if (!editOrder.business_name || !editOrder.phone) {
      toast.error('Business name and phone are required')
      return
    }

    setSubmitting(true)

    try {
      const rawMaterialCost = editRawMaterials.reduce((sum, item) => sum + Number(item.cost || 0), 0)
      const expenseTotal = rawMaterialCost

      const response = await fetch(`/api/admin/htv-orders?id=${editingOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: editOrder.business_name,
          phone: editOrder.phone,
          email: editOrder.email || null,
          size: editOrder.size,
          color: editOrder.color,
          quantity: Number(editOrder.quantity || 1),
          delivery_area: editOrder.delivery_area,
          rush_order: Boolean(editOrder.rush_order),
          subtotal: editOrder.subtotal,
          delivery_fee: editOrder.delivery_fee,
          total: editOrder.total,
          raw_materials: editRawMaterials.filter((item) => item.material && item.material.trim()),
          raw_material_cost: rawMaterialCost,
          labor_cost: Number(editOrder.labor_cost || 0),
          other_expenses: Number(editOrder.other_expenses || 0),
          revenue: editOrder.revenue,
          expenses: editOrder.expenses,
          profit: editOrder.profit,
          status: editOrder.status,
          notes: editOrder.notes || null,
        }),
      })

      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update order')
      }

      setOrders((prev) =>
        prev.map((order) => (order.id === editingOrderId ? payload.order : order))
      )
      handleCancelEdit()
      toast.success('Order updated successfully')
    } catch (err) {
      console.error('Update order failed', err)
      toast.error(err.message || 'Failed to update order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/admin/htv-orders?id=${orderId}`, {
        method: 'DELETE',
      })

      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to delete order')
      }

      setOrders((prev) => prev.filter((order) => order.id !== orderId))
      setExpandedOrderId(null)
      toast.success('Order deleted successfully')
    } catch (err) {
      console.error('Delete order failed', err)
      toast.error(err.message || 'Failed to delete order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadLogo = async (order) => {
    try {
      if (!order.logo_url) {
        toast.error('No logo URL available')
        return
      }

      if (order.logo_url === 'manual-entry') {
        toast.error('This order was created manually without a logo')
        return
      }

      if (order.logo_url === 'pending-upload') {
        toast.error('Logo upload is pending - it may not be available yet')
        return
      }

      const response = await fetch(order.logo_url)
      if (!response.ok) throw new Error('Failed to fetch logo')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = order.logo_filename || `logo_${order.id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Logo downloaded successfully')
    } catch (err) {
      console.error('Download failed', err)
      toast.error('Failed to download logo')
    }
  }

  const handleViewLogo = (order) => {
    if (!order.logo_url) {
      toast.error('No logo URL available')
      return
    }

    if (order.logo_url === 'manual-entry') {
      toast.error('This order was created manually without a logo')
      return
    }

    if (order.logo_url === 'pending-upload') {
      toast.error('Logo upload is pending - it may not be available yet')
      return
    }

    setViewingLogoOrderId(order.id)
  }

  const handleGenerateInvoicePDF = async (order) => {
    setIsGeneratingInvoice(true)
    try {
      if (!invoiceRef.current) {
        toast.error('Invoice component not ready')
        return
      }

      const invoiceNumber = order.id.substring(0, 8).toUpperCase()
      const fileName = `Invoice_${invoiceNumber}_${order.business_name.replace(/\s+/g, '_')}.pdf`

      await generateInvoicePDF(invoiceRef.current, fileName)
      toast.success('Invoice PDF downloaded successfully')
    } catch (err) {
      console.error('PDF generation failed', err)
      toast.error('Failed to generate PDF invoice')
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  const handleGenerateInvoicePNG = async (order) => {
    setIsGeneratingInvoice(true)
    try {
      if (!invoiceRef.current) {
        toast.error('Invoice component not ready')
        return
      }

      const invoiceNumber = order.id.substring(0, 8).toUpperCase()
      const fileName = `Invoice_${invoiceNumber}_${order.business_name.replace(/\s+/g, '_')}.png`

      await generateInvoicePNG(invoiceRef.current, fileName)
      toast.success('Invoice PNG downloaded successfully')
    } catch (err) {
      console.error('PNG generation failed', err)
      toast.error('Failed to generate PNG invoice')
    } finally {
      setIsGeneratingInvoice(false)
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
              <p className="text-sm uppercase tracking-[0.3em] text-accent">Dosnine HTV Business</p>
              <h1 className="mt-3 text-3xl font-black text-black sm:text-4xl">HTV Orders - Revenue, Expenses & Profit</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                Manage and create Dosnine HTV business orders. Track revenue, expenses, and profitability for each custom logo cutting order.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-3xl bg-gray-100 p-4 text-sm text-gray-700">
                Orders displayed: <span className="font-bold text-black">{filteredOrders.length}</span>
              </div>
              <button
                onClick={() => setIsImageEditOpen(true)}
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90 flex items-center gap-2"
              >
                <Sparkles size={18} />
                Edit Image with AI
              </button>
            </div>
          </div>

          <section className="mb-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-black">Add manual HTV order</h2>
                <p className="mt-2 text-sm text-gray-600">Enter order details, raw material costs, and create a new order in the database.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOrderFormOpen(!isOrderFormOpen)}
                className="inline-flex items-center gap-2 rounded-2xl bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-semibold text-black transition"
              >
                {isOrderFormOpen ? (
                  <>
                    <ChevronUp size={18} />
                    Collapse form
                  </>
                ) : (
                  <>
                    <ChevronDown size={18} />
                    Expand form
                  </>
                )}
              </button>
            </div>

            {isOrderFormOpen && (
              <>
                <div className="mt-8 grid gap-6 sm:grid-cols-2">
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
                    type="text"
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
              </>
            )}
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

          

              <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-black">Orders</h2>
                    <p className="mt-2 text-sm text-gray-600">View each order with raw material usage, cost, and margin details. Click to expand.</p>
                  </div>
                </div>

                {editingOrderId && editOrder && (
                  <div className="mt-6 rounded-3xl bg-blue-50 border-2 border-blue-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-blue-900">Edit Order - {editOrder.business_name}</h3>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
                      >
                        Close
                      </button>
                    </div>

                    <form onSubmit={handleUpdateOrder} className="grid gap-6">
                      <div className="grid gap-6 lg:grid-cols-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900">Business name</label>
                          <input
                            value={editOrder.business_name || ''}
                            onChange={(e) => setEditOrder({ ...editOrder, business_name: e.target.value })}
                            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-black focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900">Phone</label>
                          <input
                            value={editOrder.phone || ''}
                            onChange={(e) => setEditOrder({ ...editOrder, phone: e.target.value })}
                            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-black focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900">Email</label>
                          <input
                            type="text"
                            value={editOrder.email || ''}
                            onChange={(e) => setEditOrder({ ...editOrder, email: e.target.value })}
                            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-black focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900">Status</label>
                          <select
                            value={editOrder.status || 'pending'}
                            onChange={(e) => setEditOrder({ ...editOrder, status: e.target.value })}
                            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-black focus:border-blue-500 focus:outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900">Color</label>
                          <select
                            value={editOrder.color || 'black'}
                            onChange={(e) => setEditOrder({ ...editOrder, color: e.target.value })}
                            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-black focus:border-blue-500 focus:outline-none"
                          >
                            <option value="black">Black</option>
                            <option value="white">White</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={editOrder.quantity || 1}
                            onChange={(e) => setEditOrder({ ...editOrder, quantity: Number(e.target.value) })}
                            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-black focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900">Delivery area</label>
                          <select
                            value={editOrder.delivery_area || 'halfWayTree'}
                            onChange={(e) => setEditOrder({ ...editOrder, delivery_area: e.target.value })}
                            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-black focus:border-blue-500 focus:outline-none"
                          >
                            {Object.entries(DELIVERY).map(([key, data]) => (
                              <option key={key} value={key}>
                                {data.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900">Notes</label>
                        <textarea
                          value={editOrder.notes || ''}
                          onChange={(e) => setEditOrder({ ...editOrder, notes: e.target.value })}
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-black focus:border-blue-500 focus:outline-none h-24"
                          placeholder="Order notes"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Saving...' : 'Save Changes'}
                      </button>
                    </form>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  {filteredOrders.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 p-6 text-center text-gray-600">No orders found.</div>
                  ) : (
                    filteredOrders.map((order) => {
                      const { revenue, expenses, profit, rawMaterial, labor, other } = computeOrderFinancials(order)
                      const isExpanded = expandedOrderId === order.id
                      const materialLabel = Array.isArray(order.raw_materials) && order.raw_materials.length > 0
                        ? order.raw_materials.map((item) => `${item.name || item.material} (${formatCurrency(item.cost || item.price || 0)})`).join(', ')
                        : 'Not set'

                      return (
                        <div key={order.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="w-full px-6 py-4 hover:bg-gray-50 transition flex items-center justify-between"
                          >
                            <div className="flex-1 text-left grid gap-4 lg:grid-cols-8 items-center">
                              <div className="text-xs text-gray-600">{new Date(order.created_at).toLocaleDateString('en-US')}</div>
                              <div className="text-sm font-semibold text-black truncate">{order.business_name}</div>
                              <div className="text-sm text-gray-600">{order.quantity}</div>
                              <div className="text-sm text-black font-semibold">{formatCurrency(order.total)}</div>
                              <div className="text-sm text-gray-600 truncate">{materialLabel}</div>
                              <div className="text-sm text-black">{formatCurrency(revenue)}</div>
                              <div className="text-sm font-semibold text-black">{formatCurrency(profit)}</div>
                              <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded text-center">{order.status || 'pending'}</div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp size={20} className="ml-2 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown size={20} className="ml-2 text-gray-400 flex-shrink-0" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                              <div className="flex gap-3 mb-6 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleEditOrder(order)}
                                  className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200 transition flex items-center gap-2"
                                >
                                  <Edit size={16} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrder(order.id)}
                                  disabled={submitting}
                                  className="rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  <Trash2 size={16} />
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInvoiceOrderId(order.id)}
                                  className="rounded-xl bg-green-100 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-200 transition flex items-center gap-2"
                                >
                                  <FileText size={16} />
                                  View Invoice
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleViewLogo(order)}
                                  className="rounded-xl bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-200 transition flex items-center gap-2"
                                >
                                  <Eye size={16} />
                                  View Logo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadLogo(order)}
                                  className="rounded-xl bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-200 transition flex items-center gap-2"
                                >
                                  <Download size={16} />
                                  Logo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateInvoicePDF(order)}
                                  disabled={isGeneratingInvoice}
                                  className="rounded-xl bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  <Download size={16} />
                                  PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateInvoicePNG(order)}
                                  disabled={isGeneratingInvoice}
                                  className="rounded-xl bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  <Camera size={16} />
                                  PNG
                                </button>
                               
                              </div>

                              <div className="grid gap-6 lg:grid-cols-3">
                                <div className="rounded-2xl bg-white p-4 border border-gray-200">
                                  <p className="text-xs font-semibold uppercase text-gray-600 mb-2">Cost Breakdown</p>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Material:</span>
                                      <span className="font-semibold text-black">{formatCurrency(rawMaterial)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Labor:</span>
                                      <span className="font-semibold text-black">{formatCurrency(labor)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Other:</span>
                                      <span className="font-semibold text-black">{formatCurrency(other)}</span>
                                    </div>
                                    {(order.labor_cost || 0) > 0 && (
                                      <div className="flex justify-between text-accent">
                                        <span>Additional Logo Work:</span>
                                        <span className="font-semibold">{formatCurrency(order.labor_cost)}</span>
                                      </div>
                                    )}
                                    <div className="border-t border-gray-200 pt-2 flex justify-between">
                                      <span className="font-semibold text-gray-900">Total Costs:</span>
                                      <span className="font-bold text-black text-base">{formatCurrency(rawMaterial + labor + other)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-white p-4 border border-gray-200">
                                  <p className="text-xs font-semibold uppercase text-gray-600 mb-2">Revenue & Profit</p>
                                  <div className="space-y-2 text-sm">
                                    {(() => {
                                      const totalCosts = rawMaterial + labor + other
                                      const actualProfit = revenue - totalCosts
                                      return (
                                        <>
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Base Revenue:</span>
                                            <span className="font-semibold text-black">{formatCurrency(revenue)}</span>
                                          </div>
                                          <div className="border-t border-gray-200 pt-2 flex justify-between">
                                            <span className="font-semibold text-gray-900">Total Revenue:</span>
                                            <span className="font-semibold text-black">{formatCurrency(revenue)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Total Costs:</span>
                                            <span className="font-semibold text-black">{formatCurrency(totalCosts)}</span>
                                          </div>
                                          <div className="border-t border-gray-200 pt-2 flex justify-between">
                                            <span className="font-semibold text-gray-900">Profit:</span>
                                            <span className={`font-bold text-base ${actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(actualProfit)}</span>
                                          </div>
                                        </>
                                      )
                                    })()}
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-white p-4 border border-gray-200">
                                  <p className="text-xs font-semibold uppercase text-gray-600 mb-2">Margin</p>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Margin %:</span>
                                      <span className={`font-bold text-base ${(profit / revenue * 100) >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
                                        {revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Status:</span>
                                      <span className="font-semibold text-black">{order.status || 'pending'}</span>
                                    </div>
                                    {order.notes && (
                                      <div className="border-t border-gray-200 pt-2">
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Notes:</p>
                                        <p className="text-gray-700 text-xs">{order.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {Array.isArray(order.raw_materials) && order.raw_materials.length > 0 && (
                                <div className="mt-4 rounded-2xl bg-white p-4 border border-gray-200">
                                  <p className="text-xs font-semibold uppercase text-gray-600 mb-3">Raw Materials Used</p>
                                  <div className="space-y-2">
                                    {order.raw_materials.map((material, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-sm px-2 py-2 bg-gray-50 rounded">
                                        <span className="text-gray-700">{material.name || material.material}</span>
                                        <span className="font-semibold text-black">{formatCurrency(material.cost || material.price || 0)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <ImageEditModal isOpen={isImageEditOpen} onClose={() => setIsImageEditOpen(false)} />

      {/* Invoice Modal */}
      {invoiceOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900">Order Invoice</h3>
              <button
                onClick={() => setInvoiceOrderId(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content - Scrollable Invoice */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="bg-white rounded-lg">
                {invoiceOrderId && orders.find(o => o.id === invoiceOrderId) && (
                  <HtvInvoice 
                    ref={invoiceRef}
                    order={orders.find(o => o.id === invoiceOrderId)}
                    onClose={() => setInvoiceOrderId(null)}
                  />
                )}
              </div>
            </div>

            {/* Modal Footer - Download Buttons */}
            <div className="border-t border-gray-200 bg-gray-50 p-6 flex gap-3 justify-end flex-wrap">
              <button
                onClick={() => setInvoiceOrderId(null)}
                className="rounded-xl bg-gray-200 px-6 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-300 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const order = orders.find(o => o.id === invoiceOrderId);
                  if (order) {
                    handleGenerateInvoicePDF(order);
                  }
                }}
                disabled={isGeneratingInvoice}
                className="rounded-xl bg-orange-100 px-6 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-200 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isGeneratingInvoice ? <><Loader size={16} className="animate-spin" /> Generating...</> : <><Download size={16} /> Download PDF</>}
              </button>
              <button
                onClick={() => {
                  const order = orders.find(o => o.id === invoiceOrderId);
                  if (order) {
                    handleGenerateInvoicePNG(order);
                  }
                }}
                disabled={isGeneratingInvoice}
                className="rounded-xl bg-purple-100 px-6 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-200 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isGeneratingInvoice ? <><Loader size={16} className="animate-spin" /> Generating...</> : <><Camera size={16} /> Download PNG</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logo Viewing Modal */}
      {viewingLogoOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900">Logo Preview</h3>
              <button
                onClick={() => setViewingLogoOrderId(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 bg-gray-50 flex items-center justify-center min-h-96">
              {(() => {
                const order = orders.find(o => o.id === viewingLogoOrderId)
                if (!order || !order.logo_url || order.logo_url === 'manual-entry' || order.logo_url === 'pending-upload') {
                  return (
                    <div className="text-center">
                      <p className="text-gray-500">Logo not available</p>
                    </div>
                  )
                }
                return (
                  <img src={order.logo_url} alt="Logo" className="max-h-96 max-w-full object-contain" />
                )
              })()}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 bg-gray-50 p-6 flex gap-3 justify-end">
              <button
                onClick={() => setViewingLogoOrderId(null)}
                className="rounded-xl bg-gray-200 px-6 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-300 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const order = orders.find(o => o.id === viewingLogoOrderId)
                  if (order) {
                    handleDownloadLogo(order)
                  }
                }}
                className="rounded-xl bg-cyan-100 px-6 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-200 transition flex items-center gap-2"
              >
                <Download size={16} />
                Download Logo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Invoice Component for PDF/PNG Generation */}
      <div style={{ position: 'absolute', left: '-9999px', width: '210mm', backgroundColor: '#fff' }}>
        {invoiceOrderId && orders.find(o => o.id === invoiceOrderId) && (
          <HtvInvoice 
            ref={invoiceRef}
            order={orders.find(o => o.id === invoiceOrderId)}
          />
        )}
      </div>
    </>
  )
}
