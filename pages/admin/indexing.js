import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useUser } from '@clerk/nextjs';

export default function IndexingPage() {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('clerk_id', user.id)
        .single();

      if (data?.is_admin) {
        setIsAdmin(true);
      }
    };

    checkAdminStatus();
  }, [user]);

  const submitUrls = async () => {
    setLoading(true);
    setResults(null);

    const urlArray = urls
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean);

    const res = await fetch('/api/index-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: urlArray }),
    });

    const data = await res.json();
    setResults(data);
    setLoading(false);
  };

  const graphData =
    results?.results?.map((r, index) => ({
      name: `#${index + 1}`,
      status: r.status === 'Submitted' ? 1 : 0,
    })) || [];

  if (!isAdmin) {
    return (
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <p className="text-center text-gray-700 mt-10">
          You do not have access to this page.
        </p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Bulk Google Indexing Tool - Expense Goose</title>
        <meta
          name="description"
          content="Submit multiple URLs to Google's Indexing API easily. Boost your SEO and speed up indexing times with our bulk indexing tool."
        />
        <meta
          name="keywords"
          content="Google Indexing, Bulk Submit URLs, SEO Tools, Index API, URL Indexing"
        />
        <link rel="canonical" href="https://www.expensegoose.com/admin/indexing" />
      </Head>

      <main className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-6">
          Google Bulk Indexing Tool
        </h1>
        <p className="text-base text-gray-700 mb-4 text-center">
          Paste your URLs below and submit to speed up your page indexing.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Submit URLs</h2>
          <div className="flex flex-col gap-4">
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="Paste one URL per line..."
              rows={10}
              className="w-full p-4 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={submitUrls}
              disabled={loading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            >
              {loading ? 'Submitting...' : 'Submit URLs'}
            </button>
          </div>
        </section>

        {results && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Results</h2>
            <ul className="list-disc list-inside mb-6 text-base text-gray-700">
              {Array.isArray(results?.results) &&
                results.results.map((r, i) => (
                  <li key={i}>
                    {r.url}: {r.status}
                  </li>
                ))}
            </ul>


          </section>
        )}
      </main>
    </>
  );
}
