import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { MessageCircle, Send, Users, Eye, CheckCircle2, Clock } from 'lucide-react';

export default function AdminFeedbackPage() {
  const { user } = useUser();
  const [feedback, setFeedback] = useState([]);
  const [unreadResponses, setUnreadResponses] = useState(0);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('compose');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [editMessage, setEditMessage] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchFeedback();
      const interval = setInterval(fetchFeedback, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function fetchFeedback() {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data } = await axios.get('/api/admin/feedback', {
        params: { clerkId: user.id }
      });
      setFeedback(data.feedback || []);
      setUnreadResponses(data.unreadResponses || 0);
    } catch (error) {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      const { data } = await axios.post('/api/admin/feedback', {
        clerkId: user.id,
        message: message.trim(),
        agentIds: []
      });
      toast.success(`Message sent to ${data.count} agent${data.count > 1 ? 's' : ''}!`);
      setMessage('');
      setView('history');
      await fetchFeedback();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to send message';
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  }

  async function handleMarkResponseAsRead(feedbackId) {
    try {
      await axios.put('/api/admin/feedback', {
        clerkId: user.id,
        feedbackId
      });
      await fetchFeedback();
    } catch (error) {
      // Silently fail - not critical
    }
  }

  function viewFeedbackDetail(item) {
    setSelectedFeedback(item);
    if (item.agent_response && !item.response_read) {
      handleMarkResponseAsRead(item.id);
    }
  }

  async function handleEditMessage(feedbackId) {
    const feedbackItem = feedback.find(f => f.id === feedbackId);
    if (feedbackItem) {
      setEditingFeedback(feedbackId);
      setEditMessage(feedbackItem.admin_message);
    }
  }

  async function handleSaveEdit(feedbackId) {
    if (!editMessage.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      await axios.patch('/api/admin/feedback', {
        clerkId: user.id,
        feedbackId,
        message: editMessage.trim()
      });
      toast.success('Message updated successfully!');
      setEditingFeedback(null);
      setEditMessage('');
      await fetchFeedback();
    } catch (error) {
      toast.error('Failed to update message');
    }
  }

  async function handleDeleteMessage(feedbackId) {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete('/api/admin/feedback', {
        params: {
          clerkId: user.id,
          feedbackId
        }
      });
      toast.success('Message deleted successfully!');
      setSelectedFeedback(null);
      await fetchFeedback();
    } catch (error) {
      toast.error('Failed to delete message');
    }
  }

  return (
    <>
      <Head>
        <title>Agent Feedback Manager — Admin Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <AdminLayout />


          {/* Main Content Card */}
          <div className="bg-white rounded-lg shadow-lg">
            {/* Tabs */}
            {!selectedFeedback && (
              <div className="flex border-b">
                <button
                  onClick={() => setView('compose')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    view === 'compose'
                      ? 'text-accent border-b-2 border-accent'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Send size={20} />
                    Compose Message
                  </div>
                </button>
                <button
                  onClick={() => setView('history')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors relative ${
                    view === 'history'
                      ? 'text-accent border-b-2 border-accent'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Clock size={20} />
                    Message History
                    {unreadResponses > 0 && (
                      <span className="bg-accent text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadResponses}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              {selectedFeedback ? (
                // Detail View
                <div className="space-y-6">
                  <button
                    onClick={() => setSelectedFeedback(null)}
                    className="text-accent hover:text-accent text-sm font-medium"
                  >
                    ← Back to history
                  </button>

                  {/* Agent Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Agent Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>{' '}
                        <span className="font-medium">{selectedFeedback.agents?.users?.full_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>{' '}
                        <span className="font-medium">{selectedFeedback.agents?.users?.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>{' '}
                        <span className="font-medium">{selectedFeedback.agents?.users?.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Business:</span>{' '}
                        <span className="font-medium">{selectedFeedback.agents?.business_name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Your Message */}
                  <div className="bg-red-50 rounded-lg p-4 border-l-4 border-accent">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Send className="text-accent flex-shrink-0 mt-1" size={20} />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">Your Message</p>
                          {editingFeedback === selectedFeedback.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editMessage}
                                onChange={(e) => setEditMessage(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                                rows={4}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveEdit(selectedFeedback.id)}
                                  className="px-3 py-1 btn-accent text-white rounded text-sm"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingFeedback(null);
                                    setEditMessage('');
                                  }}
                                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-gray-700 whitespace-pre-wrap">
                                {selectedFeedback.admin_message}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                Sent {new Date(selectedFeedback.created_at).toLocaleString()}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      {!editingFeedback && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditMessage(selectedFeedback.id)}
                            className="text-accent hover:opacity-80 p-1"
                            title="Edit message"
                          >
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(selectedFeedback.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Delete message"
                          >
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agent Response */}
                  {selectedFeedback.agent_response ? (
                    <div className="bg-green-50 rounded-lg p-5 border-l-4 border-green-600 shadow-sm">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={24} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-bold text-gray-900 text-lg">Agent Response</p>
                            {!selectedFeedback.response_read && (
                              <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full animate-pulse">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap text-base leading-relaxed">
                            {selectedFeedback.agent_response}
                          </p>
                          {selectedFeedback.responded_at && (
                            <p className="text-xs text-gray-600 mt-3 flex items-center gap-1">
                              <Clock size={12} />
                              Received {new Date(selectedFeedback.responded_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-600">
                      <div className="flex items-start gap-3">
                        <Clock className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">Awaiting Response</p>
                          <p className="text-gray-700">The agent has not responded yet.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : view === 'compose' ? (
                // Compose View
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
                    <Users className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">Send to All Verified Agents</p>
                      <p className="text-gray-600">
                        This message will be sent to all agents with verified and paid status.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message to agents here..."
                      rows={10}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                      disabled={sending}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !message.trim()}
                      className="flex items-center gap-2 px-6 py-3 btn-accent text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          Send to All Agents
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                // History View
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                    </div>
                  ) : feedback.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg">No messages sent yet</p>
                      <p className="text-gray-400 text-sm mt-2">
                        Start by composing a message to agents
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {feedback.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => viewFeedbackDetail(item)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                            item.agent_response && !item.response_read
                              ? 'bg-green-50 border-green-200 hover:bg-green-100'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900">
                                  {item.agents?.users?.full_name || item.agents?.business_name || 'Agent'}
                                </span>
                                {item.agent_response && !item.response_read && (
                                  <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                                    NEW RESPONSE
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 line-clamp-2 mb-2">
                                {item.admin_message}
                              </p>
                              {item.agent_response && (
                                <div className="mt-2 p-2 bg-green-100 rounded text-sm text-gray-700 border-l-2 border-green-600">
                                  <span className="font-medium text-green-700">Agent Reply: </span>
                                  <span className="line-clamp-1">{item.agent_response}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                {item.agent_response ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 size={14} />
                                    Responded
                                  </span>
                                ) : item.message_read ? (
                                  <span className="flex items-center gap-1 text-blue-600">
                                    <Eye size={14} />
                                    Read
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-gray-400">
                                    <Clock size={14} />
                                    Unread
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
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
