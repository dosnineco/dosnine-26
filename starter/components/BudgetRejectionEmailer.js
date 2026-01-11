import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

export default function BudgetRejectionEmailer({
  open,
  onClose,
  onComplete,
  adminClerkId,
}) {
  const [allRequests, setAllRequests] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [adminAgentId, setAdminAgentId] = useState(null);
  const [budgetThreshold, setBudgetThreshold] = useState(50000);
  const [budgetMode, setBudgetMode] = useState('below'); // 'below' or 'above'
  const [customSubject, setCustomSubject] = useState('Service Request Status Update');
  const [customBody, setCustomBody] = useState(`Hello, 

At this time, your request does not meet our current approval criteria. Based on market demand, properties within certain budgets are limited, which affects our ability to successfully match requests with agents.

Your request has not been approved, but you are welcome to resubmit in the future if your requirements or budget change.

If you'd like tips on improving your chances of approval, simply reply to this email and we'll be happy to assist.

Best regards,

Tahjay, Dosnine.com`);
  const [showCustomization, setShowCustomization] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAdminAgent();
      fetchVisitorEmails();
    }
  }, [open]);

  const fetchAdminAgent = async () => {
    if (!adminClerkId) return;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', adminClerkId)
        .single();

      if (userData) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', userData.id)
          .single();

        if (agentData) {
          setAdminAgentId(agentData.id);
          console.log(`👤 Admin agent ID: ${agentData.id}`);
        }
      }
    } catch (error) {
      console.warn('Could not fetch admin agent:', error.message);
    }
  };

  const fetchVisitorEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visitor_emails')
        .select('*')
        .eq('email_status', 'not_contacted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllRequests(data || []);
      // Auto-select all initially
      setSelectedEmails(new Set((data || []).map(r => r.id)));
    } catch (error) {
      console.error('Error fetching visitor emails:', error);
      toast.error('Failed to fetch visitor emails');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRequests = () => {
    return allRequests.filter(req => {
      if (!req.budget_min) return false;
      
      if (budgetMode === 'below') {
        return req.budget_min < budgetThreshold;
      } else {
        return req.budget_min >= budgetThreshold;
      }
    });
  };

  const filteredRequests = getFilteredRequests();

  const toggleEmail = (id) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEmails(newSelected);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(filteredRequests.map(r => r.id));
    setSelectedEmails(newSelected);
    toast.success(`Selected ${newSelected.size} emails`);
  };

  const deselectAllFiltered = () => {
    setSelectedEmails(new Set());
    toast.success('Deselected all emails');
  };

  const removeFromBatch = (id) => {
    const newSelected = new Set(selectedEmails);
    newSelected.delete(id);
    setSelectedEmails(newSelected);
    toast.success('Email removed from batch');
  };

  const removeAllFromBatch = () => {
    if (confirm('Remove all emails from batch?')) {
      setSelectedEmails(new Set());
      toast.success('All emails removed from batch');
    }
  };

  const handleSendEmails = async () => {
    const toSend = filteredRequests.filter(r => selectedEmails.has(r.id));
    
    if (toSend.length === 0) {
      toast.error('No emails selected to send');
      return;
    }

    setSending(true);
    console.log(`🚀 Starting to send ${toSend.length} emails...`);

    try {
      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      for (const visitorEmail of toSend) {
        try {
          console.log(`📧 Sending to: ${visitorEmail.email}`);
          
          // Send email via Brevo
          const brevoResponse = await fetch('/api/send-brevo-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: visitorEmail.email,
              subject: customSubject,
              htmlContent: customBody.replace(/\n/g, '<br>'),
              textContent: customBody,
            }),
          });

          const brevoData = await brevoResponse.json();
          
          if (!brevoResponse.ok) {
            const errorMsg = `Brevo API error for ${visitorEmail.email}: ${brevoData.error || brevoResponse.statusText}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
            failureCount++;
            continue;
          }

          console.log(`✅ Email sent to ${visitorEmail.email}, messageId: ${brevoData.messageId}`);

          // Update visitor_emails: mark as emailed, contacted, completed
          const now = new Date().toISOString();
          const { data: updateData, error: updateError } = await supabase
            .from('visitor_emails')
            .update({
              email_status: 'emailed',
              last_emailed_at: now,
              email_campaign_count: (visitorEmail.email_campaign_count || 0) + 1,
            })
            .eq('id', visitorEmail.id)
            .select();

          if (updateError) {
            const errorMsg = `DB update error for ${visitorEmail.email}: ${updateError.message}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
            failureCount++;
            continue;
          }

          console.log(`✅ Visitor email updated for ${visitorEmail.email}`);

          // Also update service_requests table - find by client_email
          try {
            const { data: srData, error: srFetchError } = await supabase
              .from('service_requests')
              .select('id, status')
              .eq('client_email', visitorEmail.email)
              .eq('status', 'open')
              .order('created_at', { ascending: false })
              .limit(1);

            if (!srFetchError && srData && srData.length > 0) {
              const serviceRequestId = srData[0].id;
              console.log(`📋 Found service_request id: ${serviceRequestId} for client_email: ${visitorEmail.email}`);

              const updatePayload = {
                status: 'completed',
                is_contacted: true,
                updated_at: now,
                completed_at: now,
                comment: `[CONTACTED] Budget rejection email sent on ${new Date().toLocaleDateString()}. Email: ${visitorEmail.email}`
              };

              // Assign to admin agent if available
              if (adminAgentId) {
                updatePayload.assigned_agent_id = adminAgentId;
                updatePayload.assigned_at = now;
              }

              const { data: updateResult, error: srUpdateError } = await supabase
                .from('service_requests')
                .update(updatePayload)
                .eq('id', serviceRequestId)
                .select();

              if (srUpdateError) {
                console.error(`❌ Error updating service_request: ${srUpdateError.message}`);
                console.error(`   Error details:`, srUpdateError);
              } else {
                console.log(`✅ Service request marked as completed`);
                console.log(`   Updated record:`, updateResult);
              }
            } else {
              console.log(`ℹ️  No open service_request found for client_email: ${visitorEmail.email}`);
            }
          } catch (srError) {
            console.warn(`⚠️  Error updating service_request: ${srError.message}`);
          }

          console.log(`✅ All updates completed for ${visitorEmail.email}`);
          successCount++;
          
        } catch (error) {
          const errorMsg = `Error processing ${visitorEmail.email}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          failureCount++;
        }
      }

      console.log(`\n📊 SUMMARY:`);
      console.log(`   Sent: ${successCount}/${toSend.length}`);
      console.log(`   Failed: ${failureCount}/${toSend.length}`);
      if (errors.length > 0) {
        console.log(`   Errors: ${errors.join(' | ')}`);
      }

      if (successCount > 0) {
        toast.success(
          `✅ Emails sent: ${successCount}/${toSend.length}${failureCount > 0 ? ` (${failureCount} failed)` : ''}`
        );
      } else {
        toast.error(`❌ Failed to send emails. Check console for details.`);
      }

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('❌ Error sending emails:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-5 border-b flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Send Budget Rejection Emails</h3>
            <p className="text-sm text-gray-500">Customize and send emails to visitor leads</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Budget Filter Section */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Budget Filter</h4>
            <div className="flex gap-3 flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select
                  value={budgetMode}
                  onChange={(e) => setBudgetMode(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none bg-white"
                >
                  <option value="below">Below Budget</option>
                  <option value="above">Above Budget</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Threshold (JMD)</label>
                <input
                  type="number"
                  value={budgetThreshold}
                  onChange={(e) => setBudgetThreshold(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none w-36 bg-white"
                  step="1000"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={selectAllFiltered}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Select All Filtered
                </button>
                <button
                  onClick={deselectAllFiltered}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Showing {filteredRequests.length} emails {budgetMode === 'below' ? 'below' : 'above'} JMD {budgetThreshold.toLocaleString()}
            </p>
          </div>

          {/* Email Customization Section */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <button
              onClick={() => setShowCustomization(!showCustomization)}
              className="w-full flex items-center justify-between font-semibold text-gray-900"
            >
              <span>Customize Email Template</span>
              <span>{showCustomization ? '▼' : '▶'}</span>
            </button>
            
            {showCustomization && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                  <textarea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none font-mono text-sm bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Email List */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">
                  All Users to Send To
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Total: {filteredRequests.length} • Selected: {filteredRequests.filter(r => selectedEmails.has(r.id)).length}
                </p>
              </div>
              {selectedEmails.size > 0 && (
                <button
                  onClick={removeAllFromBatch}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Remove All from Batch
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading emails...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No visitor emails found matching the filter
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      selectedEmails.has(request.id)
                        ? 'bg-gray-300 border-gray-400'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmails.has(request.id)}
                      onChange={() => toggleEmail(request.id)}
                      className="w-4 h-4 text-gray-700 focus:ring-gray-500 border-gray-300 rounded cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{request.email}</p>
                      <p className="text-xs text-gray-500">
                        Budget: <span className="font-semibold">JMD {request.budget_min?.toLocaleString() || 'N/A'}</span> • 
                        Created: {new Date(request.created_at).toLocaleDateString()} • 
                        ID: {String(request.id).substring(0, 8)}...
                      </p>
                    </div>
                    {selectedEmails.has(request.id) && (
                      <button
                        onClick={() => removeFromBatch(request.id)}
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-200 p-1 rounded transition-colors"
                        title="Remove from batch"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmails}
              disabled={sending || selectedEmails.size === 0}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending...' : `Send Emails (${filteredRequests.filter(r => selectedEmails.has(r.id)).length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
