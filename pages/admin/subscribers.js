import { useState, useEffect } from "react";
import Head from "next/head";
import { supabase } from "../../lib/supabase";
import { useUser } from "@clerk/nextjs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PageViewsAdmin() {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pageViews, setPageViews] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [graphData, setGraphData] = useState([]);
  const [sortField, setSortField] = useState("view_count");
  const [sortOrder, setSortOrder] = useState("desc");
  const [totalViewsToday, setTotalViewsToday] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

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
        fetchUsers();
        fetchTotalViewsToday();
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

    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, is_subscribed");

      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers(data);
        setTotalUsers(data.length);
      }
    };

    const fetchTotalViewsToday = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      try {
        const { data, error } = await supabase
          .from("page_views")
          .select("view_count")
          .gte("last_viewed", startOfDay.toISOString());

        if (error) {
          console.error("Error fetching today's total views:", error);
        } else {
          const totalViews = data.reduce((sum, page) => sum + page.view_count, 0);
          setTotalViewsToday(totalViews);
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
    setCurrentPage(1);
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
        <title>Subscribers</title>
        <meta name="description" content="View all live and current analytics of the website." />
      </Head>

      <main className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-6">Subscribers Dashboard</h1>

        <div className="mb-6">
      
          <h2 className="text-xl font-semibold text-gray-700">
            Total Users: <span className="text-blue-500">{totalUsers}</span>
          </h2>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">User Details</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-2 text-sm text-gray-700">{user.full_name || "N/A"}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{user.email}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {user.is_subscribed ? "Paid" : "Unpaid"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

   

     
      </main>
    </>
  );
}