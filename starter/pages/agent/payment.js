import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRoleProtection } from '../../lib/useRoleProtection';
import { isVerifiedAgent, needsAgentPayment } from '../../lib/rbac';
import { FiCopy, FiCheck, FiAlertCircle, FiUpload } from 'react-icons/fi';
import { supabase } from '../../lib/supabase';

const UNLOCK_FEE = 8050;

export default function AgentPayment() {
  const { loading: authLoading, userData } = useRoleProtection({
    checkAccess: (data) => isVerifiedAgent(data) && needsAgentPayment(data),
    redirectTo: '/agent/dashboard',
    message: 'Invalid access'
  });

  const { user } = useUser();
  const router = useRouter();
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const bankDetails = [
    {
      bank: "Scotiabank Jamaica",
      accountName: "Tahjay Thompson",
      accountNumber: "010860258",
      branch: "50575"
    },
    {
      bank: "National Commercial Bank (NCB)",
      accountName: "Tahjay Thompson",
      accountNumber: "404386522",
      branch: "uwi"
    },
    {
      bank: "Jamaica National Bank (JN)",
      accountName: "Tahjay Thompson",
      accountNumber: "2094746895",
      branch: "Any Branch"
    }
  ];

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`${field} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload JPG, PNG, or PDF file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setProofFile(file);
  };

  const handleSubmitProof = async () => {
    if (!proofFile) {
      toast.error('Please upload payment proof');
      return;
    }

    setUploading(true);
    try {
      // Get user data first
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      if (userError || !dbUser) {
        throw new Error('User not found');
      }

      // Get agent data
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', dbUser.id)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent profile not found');
      }

      // Upload file directly to Supabase Storage (client-side, no service role needed)
      const timestamp = Date.now();
      const fileExt = proofFile.name.split('.').pop();
      const filePath = `payment-proofs/${agent.id}_${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('agent-documents')
        .upload(filePath, proofFile, {
          contentType: proofFile.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('agent-documents')
        .getPublicUrl(filePath);

      // Update agent payment status directly in Supabase
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          payment_status: 'paid',
          payment_proof_url: urlData.publicUrl,
          payment_date: new Date().toISOString()
        })
        .eq('id', agent.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error('Failed to update payment status: ' + updateError.message);
      }

      toast.success('Payment proof submitted successfully! You now have full access.');
      router.push('/agent/dashboard');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to submit proof. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Unlock Agent Access — Dosnine Properties</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Congratulations Banner */}
          <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-1">🎉 Congratulations! You're Verified</h3>
                <p className="text-green-800">
                  Your agent application has been approved. Complete this payment to unlock 6 months of full access.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-accent text-white px-8 py-6">
              <h1 className="text-3xl font-bold">Unlock Agent Features</h1>
              <p className="mt-2 text-white/90">One-time payment via bank transfer</p>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">What You'll Get:</h2>
                <ul className="space-y-3">
                  {[
                    'Access to all client requests (buy, rent, sell, lease)',
                    'Direct client contact information',
                    'Unlimited property postings',
                    'Priority listing placement',
                    'Real-time request notifications',
                    'Client dashboard and messaging'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg className="w-6 h-6 text-accent mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pricing */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8 border-2 border-accent/20">
                <div className="text-center">
                  <p className="text-gray-600 text-sm uppercase tracking-wide">6-Month Access Payment</p>
                  <p className="text-5xl font-bold text-accent mt-2">J${UNLOCK_FEE.toLocaleString()}</p>
                  <p className="text-gray-500 mt-2">6 months access • No recurring fees during period</p>
                </div>
              </div>

              {/* Bank Transfer Instructions */}
              <div className="bg-gray-100 border-l-4 border-blue-500 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <FiAlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Payment Instructions</h3>
                    <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
                      <li>Transfer J${UNLOCK_FEE.toLocaleString()} to any of the bank accounts below</li>
                      <li>In the transfer notes/description, include: <strong>Your Email</strong> and <strong>"Agent Payment"</strong></li>
                      <li>Take a screenshot or photo of the receipt</li>
                      <li>Upload the proof below</li>
                    </ol>
                  </div>
                </div>

                {bankDetails.map((bank, index) => {
                  const cardColors = {
                    "Scotiabank Jamaica": "bg-red-200 border-l-4 border-red-500",
                    "National Commercial Bank (NCB)": "bg-blue-200 border-l-4 border-blue-500",
                    "Jamaica National Bank (JN)": "bg-yellow-50 border-l-4 border-yellow-500"
                  };
                  const headerColors = {
                    "Scotiabank Jamaica": "text-red-700 border-red-200",
                    "National Commercial Bank (NCB)": "text-blue-700 border-blue-200",
                    "Jamaica National Bank (JN)": "text-yellow-700 border-yellow-200"
                  };
                  return (
                  <div key={index} className={`rounded-lg p-4 mb-3 last:mb-0 ${cardColors[bank.bank] || 'bg-white'}`}>
                    <h4 className={`font-semibold mb-3 border-b pb-2 ${headerColors[bank.bank] || 'text-gray-900'}`}>{bank.bank}</h4>
                    <div className="space-y-2">
                      {Object.entries(bank).filter(([key]) => key !== 'bank').map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{value}</span>
                            <button
                              onClick={() => copyToClipboard(value, `${bank.bank}-${key}`)}
                              className="text-blue-600 hover:text-blue-700 p-1"
                            >
                              {copied === `${bank.bank}-${key}` ? <FiCheck size={14} /> : <FiCopy size={14} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })}

                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                  <p className="text-xs text-yellow-800">
                    <strong>Important:</strong> Include your email ({user?.primaryEmailAddress?.emailAddress}) in the payment notes so we can verify your payment quickly.
                  </p>
                </div>
              </div>

              {/* Upload Proof */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Upload Payment Proof (Receipt/Screenshot)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-accent transition">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="proof-upload"
                  />
                  <label htmlFor="proof-upload" className="cursor-pointer">
                    <div className="text-gray-600">
                      {proofFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FiCheck className="text-green-600" size={24} />
                          <span className="font-medium text-green-600">{proofFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 5MB</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitProof}
                disabled={!proofFile || uploading}
                className="w-full btn-primary btn-lg"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Payment Proof'
                )}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                ⏱️ Verification typically takes 12-24 hours during business days
              </p>

              {/* Security Note */}
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Secure payment • We'll email you once verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-lg mb-4">Frequently Asked Questions</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-gray-900">How long does this payment cover?</p>
                <p className="text-gray-600 mt-1">This payment provides 6 months of full access to all agent features.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">How long does verification take?</p>
                <p className="text-gray-600 mt-1">Usually 12-24 hours during business days. We'll email you once verified.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">What payment methods are accepted?</p>
                <p className="text-gray-600 mt-1">Bank transfer to Scotiabank, NCB, or JN Bank. Include your email in the transfer notes.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Can I get a refund?</p>
                <p className="text-gray-600 mt-1">Yes, within 7 days if you haven't accessed any client requests.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
