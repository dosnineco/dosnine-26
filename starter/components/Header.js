import Link from 'next/link';
import { useRouter } from 'next/router';
import { UserButton, useUser } from '@clerk/nextjs';
import { FiHome, FiGrid, FiPlusCircle, FiMenu, FiSettings } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Header() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('clerk_id', user.id)
        .single();
      
      console.log('Admin check - Clerk ID:', user.id);
      console.log('Admin check - User data:', data);
      console.log('Admin check - Error:', error);
      console.log('Admin check - Is Admin:', data?.role === 'admin');
      
      setIsAdmin(data?.role === 'admin');
    };
    checkAdmin();
  }, [user]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 ">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-800 hover:text-gray-600 transition flex items-center gap-2">
          <span className="hidden sm:inline">Dosnine Rentals</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          {isSignedIn ? (
            <>
              <Link 
                href="/" 
                className={`px-3 py-2 rounded-lg hover:bg-gray-100 transition text-sm flex items-center ${router.pathname === '/' ? ' text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Browse
              </Link>
              <Link 
                href="/landlord/dashboard" 
                className={`px-3 py-2 rounded-lg transition text-sm flex items-center gap-1 ${router.pathname === '/landlord/dashboard' ? ' text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <FiGrid size={16} />
                Properties
              </Link>
              <Link 
                href="/landlord/new-property" 
                className="px-3 py-2 rounded-lg hover:bg-gray-100 transition text-sm flex items-center flex items-center gap-1"
              >
                <FiPlusCircle size={16} />
                Post
              </Link>
              {isAdmin && (
                <Link 
                  href="/admin/dashboard" 
                  className={`px-3 py-2 rounded-lg transition text-sm flex items-center gap-1 ${router.pathname === '/admin/dashboard' ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <FiSettings size={16} />
                  Admin
                </Link>
              )}
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <Link 
              href="/" 
              className={`px-3 py-2 rounded-lg transition text-sm ${router.pathname === '/' ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Browse
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <FiMenu size={24} />
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 py-2 px-4">
          {isSignedIn ? (
            <div className="flex flex-col gap-2">
              <Link 
                href="/" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              >
                Browse
              </Link>
              <Link 
                href="/landlord/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-2"
              >
                <FiGrid size={18} />
                My Properties
              </Link>
              <Link 
                href="/landlord/new-property" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium flex items-center justify-center gap-2"
              >
                <FiPlusCircle size={18} />
                Post Property
              </Link>
              {isAdmin && (
                <Link 
                  href="/admin/dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-2"
                >
                  <FiSettings size={18} />
                  Admin Dashboard
                </Link>
              )}
            </div>
          ) : (
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 block font-medium"
            >
              Browse
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
