import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth, useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Copy, Check, Trash2, Phone, Mail, User, Loader2 } from 'lucide-react';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent } from '../../lib/rbac';

export default function MyApplicationsPage() {
  const { loading: authLoading, userData: initialUserData } = useRoleProtection({ checkAccess: isVerifiedAgent, redirectTo: '/agent/signup' });
  const { user } = useUser();
  const { getToken, isLoaded: clerkLoaded, userId } = useAuth();

  const [applications, setApplications] = useState([]);
  const [requests, setRequests] = useState({});
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState(null);
  const [requestCost, setRequestCost] = useState(500);
  const [copied, setCopied] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (initialUserData?.agent?.id) {
      setAgentId(initialUserData.agent.id);
    }
  }, [initialUserData]);

  useEffect(() => {
    if (agentId && clerkLoaded && userId) {
      fetchApplications();
    }
  }, [agentId, clerkLoaded, userId]);

  // Load request cost setting
  useEffect(() => {
    async function loadSettings() {
      const response = await fetch('/api/site-settings/request-cost');
      const payload = await response.json();
      if (response.ok && payload?.requestCost) setRequestCost(payload.requestCost);
    }
    loadSettings();
  }, []);

  const fetchApplications = async () => {
    if (!clerkLoaded) return;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch('/api/agent/applications', {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const payload = await response.json();
      if (response.status === 401) throw new Error('Session expired. Please sign in again.');
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to load applications');

      setApplications(payload.applications || []);
      setRequests(payload.requests || {});
      if (payload.agentId) setAgentId(payload.agentId);
    } catch (err) {
      console.error('Error fetching applications:', err);
      const message = err?.message || 'Failed to load applications';
      if (message.toLowerCase().includes('session expired')) {
        toast.error(message);
        window.location.href = '/sign-in';
        return;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const withdrawApplication = async (appId) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return;
    if (!clerkLoaded) return toast.error('Authentication still loading, please try again');
    if (!userId) {
      toast.error('Session expired. Please sign in again.');
      window.location.href = '/sign-in';
      return;
    }

    const toastId = toast.loading('Withdrawing...');
    try {
      const token = await getToken();
      const response = await fetch('/api/agent/applications', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ applicationId: appId })
      });
      const payload = await response.json();
      if (response.status === 401) throw new Error('Session expired. Please sign in again.');
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to withdraw application');
      toast.success('Application withdrawn', { id: toastId });
      fetchApplications();
    } catch (err) {
      console.error('Error withdrawing application:', err);
      const message = err?.message || 'Failed to withdraw application';
      if (message.toLowerCase().includes('session expired')) {
        toast.error(message, { id: toastId });
        window.location.href = '/sign-in';
        return;
      }
      toast.error(message, { id: toastId });
    }
  };

  const bankDetails = [
    {
      bank: 'Scotiabank Jamaica',
      accountName: 'Tahjay Thompson',
      accountNumber: '010860258',
      branch: '50575'
    }
  ];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-accent" />
      </div>
    );
  }

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Pending Review' },
    approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Approved' },
    rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' }
  };

  const stats = {
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const pendingApplications = applications.filter(a => a.status === 'pending');

  const totalDue = pendingApplications.reduce((sum, app) => {
    const req = requests[app.request_id];
    if (!req) return sum + requestCost;
    
    const budget = req.budget_max || req.budget_min || 0;
    if (req.request_type === 'buy') return sum + 1100;
    if (req.request_type === 'rent' && budget >= 200000) return sum + 750;
    return sum + requestCost;
  }, 0);

  const pendingIds = pendingApplications.map(a => a.request_id).join(', ');

  const tabs = [
    { id: 'all', label: 'All Applications' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' }
  ];

  const filteredApplications = applications.filter(app => 
    activeTab === 'all' ? true : app.status === activeTab
  );

  return (
    <>
      <Head>
        <title>My Request Applications</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold mb-2">My Request Applications</h1>
          <p className="text-gray-600 mb-8">Track your submitted requests for parish listings</p>

          {/* Payment Section for Pending Requests */}
          {totalDue > 0 && (
            <div className="mb-10 bg-white border-l-4 border-accent p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Payment Required</h3>
                  <p className="text-gray-600">You have {pendingApplications.length} pending application(s).</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Due</p>
                  <p className="text-3xl font-bold text-accent">J${totalDue.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {bankDetails.map((bank, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded border">
                    <h4 className="font-bold mb-3">{bank.bank}</h4>
                    {Object.entries(bank)
                      .filter(([k]) => k !== 'bank')
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <div className="flex gap-2 items-center">
                            <span className="font-mono font-medium">{v}</span>
                            <button onClick={() => copyToClipboard(v, `${i}-${k}`)} className="text-gray-400 hover:text-accent">
                              {copied === `${i}-${k}` ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}

                <div className="flex flex-col justify-between">
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded text-sm mb-4">
                    <strong>Instructions:</strong> Transfer the total amount and upload proof via WhatsApp.
                    <br />Include your Agent Name and the Request IDs below.
                  </div>
                  
                  <a
                    href={`https://wa.me/18763369045?text=Payment proof for pending requests.%0AAgent: ${initialUserData?.agent?.name}%0ATotal: J$${totalDue}%0ARequest IDs: ${pendingIds}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center bg-accent hover:bg-accent/90 text-white py-3 rounded-lg font-bold transition"
                  >
                    Upload Proof on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                    ${activeTab === tab.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {tab.label}
                  <span className={`py-0.5 px-2.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-gray-900'
                  }`}>
                    {tab.id === 'all' ? applications.length : applications.filter(a => a.status === tab.id).length}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
              <p className="text-gray-600 mb-3">No {activeTab !== 'all' ? activeTab : ''} applications found</p>
              <p className="text-sm text-gray-500">Go to <a href="/agent/parish-requests" className="text-accent hover:underline">Parish Requests</a> to find requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map(app => {
                const request = requests[app.request_id];
                const statusInfo = statusConfig[app.status];
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={app.id}
                    className={`rounded-lg border p-6 bg-white shadow-sm transition hover:shadow-md ${statusInfo.border}`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center gap-3 mb-3">
                          <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color} bg-white border ${statusInfo.border}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {request?.request_type?.toUpperCase()} • {request?.property_type}
                          </h3>
                          <p className="text-sm text-gray-600 mb-1">
                            📍 {request?.location} • 🛏️ {request?.bedrooms}bd • 🚿 {request?.bathrooms}ba
                          </p>
                          {request?.budget_min && (
                            <p className="text-sm font-medium text-gray-700 mb-3">
                              💰 J${request.budget_min?.toLocaleString()} - J${request.budget_max?.toLocaleString()}
                            </p>
                          )}

                          {/* Client Data - Only for Approved */}
                          {app.status === 'approved' && (
                            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
                              <h4 className="text-sm font-bold text-green-900 mb-2">Client Contact Details</h4>
                              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <User size={16} className="text-green-600" />
                                  <span>{request?.client_name || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-700">
                                  <Mail size={16} className="text-green-600" />
                                  <a href={`mailto:${request?.client_email}`} className="hover:underline">{request?.client_email || 'N/A'}</a>
                                </div>
                                <div className="flex items-center gap-2 text-gray-700">
                                  <Phone size={16} className="text-green-600" />
                                  <a href={`tel:${request?.client_phone}`} className="hover:underline">{request?.client_phone || 'N/A'}</a>
                                </div>
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-gray-500 mt-3">
                            Applied: {new Date(app.applied_at).toLocaleDateString()} at {new Date(app.applied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {app.reviewed_at && (
                              <> • Reviewed: {new Date(app.reviewed_at).toLocaleDateString()}</>
                            )}
                          </p>
                          {app.notes && (
                            <p className="text-sm text-gray-700 mt-2 p-2 bg-white rounded border border-gray-200">
                              <span className="font-medium">Note:</span> {app.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {app.status === 'pending' && (
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => withdrawApplication(app.id)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition border border-red-200"
                            title="Withdraw Application"
                          >
                            <Trash2 size={16} />
                            Withdraw
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
