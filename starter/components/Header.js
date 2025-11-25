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
          <span>Dosnine Rentals</span>
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
              href="/landlord/dashboard" 
              className={`px-3 py-2 rounded-lg transition text-sm ${router.pathname === '/landlord/dashboard' ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Post a Property
            </Link>
          )}
        </div>

        {/* Mobile Menu Button - Only show when signed in */}
        {isSignedIn && (
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <FiMenu size={24} />
          </button>
        )}
        
        {/* Mobile Post Button - Show when NOT signed in */}
        {!isSignedIn && (
          <Link 
            href="/landlord/dashboard" 
            className="md:hidden px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition"
          >
            Post a Property
          </Link>
        )}
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-64 bg-white shadow-2xl z-50 md:hidden overflow-y-auto">
            <div className="flex flex-col h-full">
              {/* Close Button */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <span className="font-bold text-gray-800">Menu</span>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 flex flex-col p-4 gap-2">
                <Link 
                  href="/" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${router.pathname === '/' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <FiHome size={18} />
                  Browse Properties
                </Link>
                
                <Link 
                  href="/landlord/dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${router.pathname === '/landlord/dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <FiGrid size={18} />
                  My Properties
                </Link>
                
                <Link 
                  href="/landlord/new-property" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${router.pathname === '/landlord/new-property' ? 'bg-gray-800 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                >
                  <FiPlusCircle size={18} />
                  Post Property
                </Link>
                
                {isAdmin && (
                  <Link 
                    href="/admin/dashboard" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${router.pathname === '/admin/dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <FiSettings size={18} />
                    Admin Dashboard
                  </Link>
                )}
              </div>

              {/* User Section at Bottom */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center justify-center">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
