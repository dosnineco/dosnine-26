import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '@clerk/nextjs'

export default function VerifiedLeadsMarketplace() {
  const { user } = useUser()
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState('verified') // verified, all
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null)

  useEffect(() => {
    loadLeads()
  }, [filter])

  const loadLeads = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('service_requests')
        .select('*')
        .eq('is_sold', false)
        .order('created_at', { ascending: false })

      if (filter === 'verified') {
        query = query.eq('verification_status', 'verified')
      }

      const { data, error } = await query

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Load leads error:', error)
    } finally {
      setLoading(false)
    }
  }

  const purchaseLead = async (leadId) => {
    if (!confirm('Purchase this verified lead for J$500? This charge will be deducted from your account.')) {
      return
    }

    setPurchasing(leadId)
    try {
      const response = await fetch('/api/leads/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          agentUserId: user.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed')
      }

      alert('✅ Lead purchased! Check your dashboard for contact details.')
      loadLeads()
    } catch (error) {
      console.error('Purchase error:', error)
      alert(error.message || 'Failed to purchase lead. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-JM', {
      style: 'currency',
      currency: 'JMD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const calculateBudgetRatio = (income, budget) => {
    if (!income || !budget) return null
    const ratio = (budget / income) * 100
    if (ratio <= 30) return { text: '✅ Excellent (≤30%)', color: 'text-green-600' }
    if (ratio <= 40) return { text: '✓ Good (≤40%)', color: 'text-blue-600' }
    return { text: '⚠️ High (>40%)', color: 'text-yellow-600' }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-pulse">Loading verified leads...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎯 Hot Verified Leads
        </h2>
        <p className="text-gray-600 mb-4">
          Pre-screened tenants with verified income & documents. Only J$500 per lead!
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={() => setFilter('verified')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'verified'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            ✅ Verified Only
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Available
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {leads.filter(l => l.verification_status === 'verified').length}
          </div>
          <div className="text-sm text-gray-600">Verified Leads</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">
            {leads.filter(l => l.phone_verified).length}
          </div>
          <div className="text-sm text-gray-600">Phone Verified</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600">
            {leads.filter(l => l.deposit_ready).length}
          </div>
          <div className="text-sm text-gray-600">Deposit Ready</div>
        </div>
      </div>

      {/* Leads */}
      {leads.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">No leads available at the moment</p>
          <p className="text-sm text-gray-500 mt-2">Check back soon for new verified tenants!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map(lead => {
            const budgetRatio = calculateBudgetRatio(lead.verified_monthly_income, lead.budget_max)
            
            return (
              <div
                key={lead.id}
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 border-2 ${
                  lead.verification_status === 'verified' ? 'border-green-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      {lead.verification_status === 'verified' && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 border border-green-300 rounded-full text-xs font-semibold">
                          ✅ VERIFIED
                        </span>
                      )}
                      {lead.phone_verified && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-xs font-semibold">
                          📞 Phone Verified
                        </span>
                      )}
                      {lead.deposit_ready && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 border border-purple-300 rounded-full text-xs font-semibold">
                          💰 Deposit Ready
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-500">Looking for</div>
                        <div className="font-semibold text-gray-900">
                          {lead.bedrooms}-bed {lead.property_type}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Location</div>
                        <div className="font-semibold text-gray-900">{lead.location}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Budget</div>
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(lead.budget_max)}/mo
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Move-in</div>
                        <div className="font-semibold text-gray-900">
                          {lead.move_in_date ? new Date(lead.move_in_date).toLocaleDateString() : 'Flexible'}
                        </div>
                      </div>
                    </div>

                    {lead.verification_status === 'verified' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-gray-600">Verified Income</div>
                            <div className="font-bold text-green-700">
                              {formatCurrency(lead.verified_monthly_income)}/mo
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Employer</div>
                            <div className="font-medium text-gray-900">{lead.employer_name}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Employment</div>
                            <div className="font-medium text-gray-900">{lead.employment_duration || 'N/A'}</div>
                          </div>
                          {budgetRatio && (
                            <div>
                              <div className="text-xs text-gray-600">Budget Ratio</div>
                              <div className={`font-medium ${budgetRatio.color}`}>
                                {budgetRatio.text}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {lead.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        <strong>Notes:</strong> {lead.description}
                      </p>
                    )}

                    {lead.verification_notes && (
                      <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
                        <strong>Admin Note:</strong> {lead.verification_notes}
                      </p>
                    )}
                  </div>

                  <div className="ml-6">
                    <div className="text-right mb-2">
                      <div className="text-2xl font-bold text-green-600">J$500</div>
                      <div className="text-xs text-gray-500">One-time fee</div>
                    </div>
                    <button
                      onClick={() => purchaseLead(lead.id)}
                      disabled={purchasing === lead.id}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                    >
                      {purchasing === lead.id ? 'Processing...' : '💰 Buy Lead'}
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="text-xs text-gray-500">
                    Posted {new Date(lead.created_at).toLocaleDateString()} • 
                    {lead.verification_status === 'verified' && ' Documents verified by Dosnine staff'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
