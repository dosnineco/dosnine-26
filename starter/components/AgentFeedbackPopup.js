import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, MessageCircle, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AgentFeedbackPopup() {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchFeedback();
      // Poll for new feedback every 30 seconds
      const interval = setInterval(fetchFeedback, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function fetchFeedback() {
    if (!user?.id) return;

    try {
      const { data } = await axios.get('/api/agent/feedback', {
        params: { clerkId: user.id }
      });
      setFeedback(data.feedback || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      // Silently fail - not critical
    }
  }

  async function handleMarkAsRead(feedbackId) {
    try {
      await axios.put('/api/agent/feedback', {
        clerkId: user.id,
        feedbackId
      });
      await fetchFeedback();
    } catch (error) {
      // Silently fail - not critical
    }
  }

  async function handleSubmitResponse(feedbackId) {
    if (!response.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/api/agent/feedback', {
        clerkId: user.id,
        feedbackId,
        response: response.trim()
      });
      toast.success('Response submitted successfully!');
      setResponse('');
      setSelectedFeedback(null);
      await fetchFeedback();
    } catch (error) {
      toast.error('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  }

  function openFeedbackDetail(item) {
    setSelectedFeedback(item);
    setResponse(item.agent_response || '');
    if (!item.message_read) {
      handleMarkAsRead(item.id);
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 btn-accent text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 z-50 flex items-center gap-2"
      >
        <MessageCircle size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-accent text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <MessageCircle className="text-accent" size={28} />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Admin Messages
                  </h2>
                  <p className="text-sm text-gray-500">
                    {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSelectedFeedback(null);
                  setResponse('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : feedback.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">No messages yet</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Admin messages will appear here
                  </p>
                </div>
              ) : selectedFeedback ? (
                // Detail View
                <div className="space-y-6">
                  <button
                    onClick={() => {
                      setSelectedFeedback(null);
                      setResponse('');
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    ← Back to messages
                  </button>

                  {/* Admin Message */}
                  <div className="bg-red-50 rounded-lg p-4 border-l-4 border-accent">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-accent flex-shrink-0 mt-1" size={20} />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-1">Admin Message</p>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {selectedFeedback.admin_message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(selectedFeedback.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Response Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Response
                    </label>
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Type your response here..."
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={submitting}
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => handleSubmitResponse(selectedFeedback.id)}
                        disabled={submitting || !response.trim()}
                        className="flex items-center gap-2 px-6 py-2 btn-accent text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send size={18} />
                            Send Response
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Previous Response if exists */}
                  {selectedFeedback.agent_response && (
                    <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-600">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={20} />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">Your Previous Response</p>
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {selectedFeedback.agent_response}
                          </p>
                          {selectedFeedback.responded_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              Sent {new Date(selectedFeedback.responded_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // List View
                <div className="space-y-3">
                  {feedback.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => openFeedbackDetail(item)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        !item.message_read
                          ? 'bg-red-50 border-red-200 hover:bg-red-100'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageCircle 
                              size={16} 
                              className={!item.message_read ? 'text-accent' : 'text-gray-400'} 
                            />
                            <span className="font-semibold text-gray-900">
                              Admin Message
                            </span>
                            {!item.message_read && (
                              <span className="px-2 py-1 bg-accent text-white text-xs font-bold rounded-full">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700 line-clamp-2 mb-2">
                            {item.admin_message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            {item.agent_response && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 size={14} />
                                Responded
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-gray-400">
                          <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
