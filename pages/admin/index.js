import Link from "next/link";
import Head from "next/head";
import { ChartBarIcon, PencilSquareIcon, TableCellsIcon, UsersIcon } from "@heroicons/react/24/outline";

export default function AdminDashboard() {
  const adminPages = [
    { title: "Blog Admin", path: "/admin/blog-admin", icon: <PencilSquareIcon className="h-10 w-10 mx-auto text-green-500" /> },
    { title: "Analytics Dashboard", path: "/admin/analytics", icon: <ChartBarIcon className="h-10 w-10 mx-auto text-blue-500" /> },
    { title: "Indexing Tool", path: "/admin/indexing", icon: <TableCellsIcon className="h-10 w-10 mx-auto text-yellow-500" /> },
    { title: "Subscribers", path: "/admin/subscribers", icon: <UsersIcon className="h-10 w-10 mx-auto text-purple-500" /> },
  ];

  return (
    
    <>
      <Head>
        <title>Admin Dashboard</title>
        <meta name="description" content="Admin dashboard with links to all admin tools and pages." />
        <meta name="keywords" content="admin, dashboard, tools, analytics, settings" />
        <link rel="canonical" href="/admin" />
      </Head>

      <div className="w-full max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-6">Admin Dashboard</h1>
        <p className="text-base text-gray-700 mb-4 text-center">
          Access all admin tools and pages from here.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {adminPages.map((page) => (
            <Link
              key={page.path}
              href={page.path}
              className="flex flex-col items-center justify-center p-6 bg-gray-100 rounded-lg hover:bg-blue-50 transition"
              aria-label={page.title}
            >
              {page.icon}
              <span className="sr-only">{page.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}