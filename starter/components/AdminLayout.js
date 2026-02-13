import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiGrid, FiUsers, FiZap, FiTrendingUp, FiPackage } from 'react-icons/fi';

export default function AdminLayout() {
  const router = useRouter();
  const path = router.pathname;

  const isActive = (p) => path === p;

  return (
    <div className=" ">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Link href="/admin/requests" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/requests') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiGrid size={14} />
            Requests
          </Link>
          <Link href="/admin/agent-applications" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/agent-applications') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiZap size={14} />
            Agent Applications
          </Link>
          <Link href="/admin/requests-management" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/requests-management') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiZap size={14} />
            Manage Requests
          </Link>
          <Link href="/admin/agents" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/agents') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiUsers size={14} />
            Agents
          </Link>
          <Link href="/admin/advertisements" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/advertisements') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiUsers size={14} />
            Advertisements
          </Link>
          <Link href="/admin/allocation" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/allocation') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiTrendingUp size={14} />
            Allocation
          </Link>
          <Link href="/admin/feedback" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/feedback') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiTrendingUp size={14} />
            Feedback
          </Link>
          <Link href="/admin/htv" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/htv') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiPackage size={14} />
            HTV Orders
          </Link>
          <Link href="/admin/users" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${isActive('/admin/users') ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}>
            <FiUsers size={14} />
            Users
          </Link>
        </div>
      </div>
    </div>
  );
}
