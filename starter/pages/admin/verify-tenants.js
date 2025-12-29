import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '../../lib/supabase'
import { useRoleProtection } from '../../lib/useRoleProtection'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { useRouter } from 'next/router'

export default function AdminVerificationDashboard() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { isAdmin, loading: roleLoading } = useRoleProtection(['admin'])
  
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState('pending') // pending, verified, unverified, all
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState(null)
  const [verificationNotes, setVerificationNotes] = useState('')

  useEffect(() => {
    if (isLoaded && !roleLoading && !isAdmin) {
      router.push('/')
    }
  }, [isLoaded, isAdmin, roleLoading, router])

  useEffect(() => {
    if (isAdmin) {
      loadLeads()
    }
  }, [isAdmin, filter])

  const loadLeads = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('verification_status', filter)
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

  const updateVerificationStatus = async (leadId, status, notes = '') => {
    try {
      const updateData = {
        verification_status: status,
        verification_notes: notes,
        phone_verified: status === 'verified' ? true : undefined
      }

      if (status === 'verified') {
        updateData.verified_at = new Date().toISOString()
        updateData.verified_by = user.id
        updateData.phone_verified_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('service_requests')
        .update(updateData)
        .eq('id', leadId)

      if (error) throw error

      alert(`Lead ${status}!`)
      setSelectedLead(null)
      setVerificationNotes('')
      loadLeads()
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update verification status')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-JM', {
      style: 'currency',
      currency: 'JMD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'verified': return 'bg-green-100 text-green-800 border-green-300'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'verified': return '✅'
      case 'pending': return '⏳'
      case 'rejected': return '❌'
      default: return '❓'
    }
  }

  if (roleLoading || !isLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!isAdmin) {
    return null
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🔍 Tenant Verification Dashboard
            </h1>
            <p className="text-gray-600">
              Review and verify tenant documents. Call them to confirm details.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-yellow-600">
                {leads.filter(l => l.verification_status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-green-600">
                {leads.filter(l => l.verification_status === 'verified').length}
              </div>
              <div className="text-sm text-gray-600">Verified</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-blue-600">
                {leads.filter(l => l.is_sold).length}
              </div>
              <div className="text-sm text-gray-600">Sold to Agents</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(leads.filter(l => l.is_sold).length * 500)}
              </div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'verified', 'unverified', 'rejected'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Leads List */}
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : leads.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600">No leads found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map(lead => (
                <div key={lead.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {lead.client_name}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(lead.verification_status)}`}>
                            {getStatusIcon(lead.verification_status)} {lead.verification_status}
                          </span>
                          {lead.phone_verified && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                              📞 Phone Verified
                            </span>
                          )}
                          {lead.is_sold && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                              💰 Sold
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Email:</span>
                            <div className="font-medium">{lead.client_email}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Phone:</span>
                            <div className="font-medium">{lead.client_phone}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Location:</span>
                            <div className="font-medium">{lead.location}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Budget:</span>
                            <div className="font-medium">
                              {lead.budget_max ? formatCurrency(lead.budget_max) : 'Not specified'}
                            </div>
                          </div>
                        </div>

                        {lead.verified_monthly_income && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Income:</span>
                                <div className="font-semibold text-green-700">
                                  {formatCurrency(lead.verified_monthly_income)}/mo
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">Employer:</span>
                                <div className="font-medium">{lead.employer_name}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Duration:</span>
                                <div className="font-medium">{lead.employment_duration || 'N/A'}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Deposit:</span>
                                <div className="font-medium">
                                  {lead.deposit_ready ? '✅ Ready' : '❌ Not ready'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {lead.description && (
                          <div className="mt-3 text-sm text-gray-600">
                            <strong>Notes:</strong> {lead.description}
                          </div>
                        )}

                        {lead.verification_notes && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                            <strong>Verification Notes:</strong> {lead.verification_notes}
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        <button
                          onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                        >
                          {selectedLead?.id === lead.id ? 'Close' : 'Review'}
                        </button>
                      </div>
                    </div>

                    {/* Verification Panel */}
                    {selectedLead?.id === lead.id && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="font-bold text-lg mb-4">📄 Documents</h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                          {lead.id_document_url && (
                            <a
                              href={lead.id_document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-center text-sm font-medium"
                            >
                              🆔 View ID
                            </a>
                          )}
                          {lead.job_letter_url && (
                            <a
                              href={lead.job_letter_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-center text-sm font-medium"
                            >
                              📄 Job Letter
                            </a>
                          )}
                          {lead.payslip_1_url && (
                            <a
                              href={lead.payslip_1_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-center text-sm font-medium"
                            >
                              💰 Payslip 1
                            </a>
                          )}
                          {lead.payslip_2_url && (
                            <a
                              href={lead.payslip_2_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-center text-sm font-medium"
                            >
                              💰 Payslip 2
                            </a>
                          )}
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <h5 className="font-semibold mb-2">📞 Call Verification Script:</h5>
                          <p className="text-sm text-gray-700 mb-2">
                            "Hi {lead.client_name}, this is [Your Name] from Dosnine. I saw you're interested in finding a {lead.property_type} in {lead.location}. I'm calling to verify your details so I can tell our agents you're a priority client. Can you confirm your monthly budget and how soon you're looking to move?"
                          </p>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Verification Notes
                          </label>
                          <textarea
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Add notes from your call... (e.g., 'Confirmed employment at ABC Corp, very responsive, move-in date flexible')"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => updateVerificationStatus(lead.id, 'verified', verificationNotes)}
                            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                          >
                            ✅ Verify & Approve
                          </button>
                          <button
                            onClick={() => updateVerificationStatus(lead.id, 'rejected', verificationNotes)}
                            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
                          >
                            ❌ Reject
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLead(null)
                              setVerificationNotes('')
                            }}
                            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
