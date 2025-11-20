import { useState, useEffect } from "react";
import Head from "next/head";
import { supabase } from "../../lib/supabase";
import { useUser } from "@clerk/nextjs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PageViewsAdmin() {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pageViews, setPageViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [graphData, setGraphData] = useState([]);
  const [sortField, setSortField] = useState("view_count");
  const [sortOrder, setSortOrder] = useState("desc");
  const [totalViewsToday, setTotalViewsToday] = useState(0); // New state for today's total views

  const PAGE_SIZE = 10;

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("is_admin")
        .eq("clerk_id", user.id)
        .single();

      if (data?.is_admin) {
        setIsAdmin(true);
        fetchPageViews();
        fetchTotalViewsToday(); // Fetch today's total views
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    };

    const fetchPageViews = async () => {
      setLoading(true);

      const { data, error, count } = await supabase
        .from("page_views")
        .select("*", { count: "exact" })
        .ilike("page_url", `%${searchQuery}%`)
        .order(sortField, { ascending: sortOrder === "asc" })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (error) {
        console.error("Error fetching page views:", error);
      } else {
        setPageViews(data);
        setTotalPages(Math.ceil(count / PAGE_SIZE));
        prepareGraphData(data);
      }
      setLoading(false);
    };

    const fetchTotalViewsToday = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0); // Set to the start of the current day

      try {
        const { data, error } = await supabase
          .from("page_views")
          .select("view_count")
          .gte("last_viewed", startOfDay.toISOString());

        if (error) {
          console.error("Error fetching today's total views:", error);
        } else {
          const totalViews = data.reduce((sum, page) => sum + page.view_count, 0);
          setTotalViewsToday(totalViews); // Update state with today's total views
        }
      } catch (err) {
        console.error("Unexpected error fetching today's total views:", err);
      }
    };

    const prepareGraphData = (data) => {
      const graphData = data.map((page) => ({
        page: page.page_url,
        views: page.view_count,
      }));
      setGraphData(graphData);
    };

    checkAdminStatus();
  }, [user, searchQuery, currentPage, sortField, sortOrder]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to the first page when searching
    fetchPageViews();
  };

  const handleSort = (field) => {
    setSortField(field);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  if (!user) {
    return (
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <p className="text-center text-gray-700 mt-10">You must be logged in to access this page.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <p className="text-center text-gray-700 mt-10">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin - Page Views</title>
        <meta name="description" content="View all live and current page views on the website." />
      </Head>

      <main className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-6">Page Views Dashboard</h1>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700">
            Total Views Today: <span className="text-blue-500">{totalViewsToday}</span>
          </h2>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <label htmlFor="search" className="block text-base text-gray-700 mb-2">
            Search by URL
          </label>
          <div className="flex">
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter page URL"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500"
            >
              Search
            </button>
          </div>
        </form>

        {loading ? (
          <p className="text-center text-gray-700">Loading...</p>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Live Page Views</h2>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th
                      className="border border-gray-300 px-4 py-2 text-left cursor-pointer"
                      onClick={() => handleSort("page_url")}
                    >
                      Page URL {sortField === "page_url" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="border border-gray-300 px-4 py-2 text-right cursor-pointer"
                      onClick={() => handleSort("view_count")}
                    >
                      View Count {sortField === "view_count" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="border border-gray-300 px-4 py-2 text-right cursor-pointer"
                      onClick={() => handleSort("last_viewed")}
                    >
                      Last Viewed {sortField === "last_viewed" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageViews.map((page) => (
                    <tr key={page.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{page.page_url}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{page.view_count}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {new Date(page.last_viewed).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Most Viewed Pages</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="page" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </section>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-gray-700">
                Page {currentPage} of {totalPages}
              </p>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}

   
      </main>
    </>
  );
}