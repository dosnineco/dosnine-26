import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/nextjs';
import { MessageCircle, Send, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CommentsSection({ serviceRequestId, currentUserId }) {
  const { user } = useUser();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [serviceRequestId, showComments]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_request_comments')
        .select(`
          *,
          users:user_id (
            full_name,
            email
          ),
          agents:agent_id (
            agent_name,
            user_id
          )
        `)
        .eq('service_request_id', serviceRequestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    setSubmitting(true);
    try {
      // Get current user's database ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      if (!userData) {
        toast.error('User not found');
        return;
      }

      // Check if user is an agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      const { error } = await supabase
        .from('service_request_comments')
        .insert({
          service_request_id: serviceRequestId,
          user_id: userData.id,
          agent_id: agentData?.id || null,
          comment_text: newComment.trim()
        });

      if (error) throw error;

      toast.success('Comment added');
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCommenterName = (comment) => {
    if (comment.agents?.agent_name) {
      return comment.agents.agent_name;
    }
    if (comment.users?.full_name) {
      return comment.users.full_name;
    }
    return comment.users?.email?.split('@')[0] || 'Anonymous';
  };

  return (
    <div className="border-t pt-3">
      <button
        onClick={() => setShowComments(!showComments)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
      >
        <MessageCircle className="w-4 h-4" />
        <span>Comments ({comments.length})</span>
      </button>

      {showComments && (
        <div className="mt-3 space-y-3">
          {/* Comments List */}
          {loading ? (
            <div className="text-center py-4 text-gray-500 text-sm">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">No comments yet</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="bg-gray-300 rounded-full p-1.5 flex-shrink-0">
                      <User className="w-3 h-3 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          {getCommenterName(comment)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 break-words">
                        {comment.comment_text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment Input */}
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
