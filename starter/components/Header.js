import Link from 'next/link';
import { useRouter } from 'next/router';
import { UserButton, useUser } from '@clerk/nextjs';
import { FiHome, FiGrid, FiPlusCircle, FiMenu, FiSettings, FiUser } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Header() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifiedAgent, setIsVerifiedAgent] = useState(false);

  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('role, agent:agents(verification_status, payment_status)')
        .eq('clerk_id', user.id)
        .single();
      
      setIsAdmin(data?.role === 'admin');
      
      // Check if user is any agent (approved or pending)
      if (data?.agent) {
        setIsAgent(true);
      }
      
      // Check if user is verified and paid agent
      if (data?.agent?.verification_status === 'approved' && 
          data?.agent?.payment_status === 'paid') {
        setIsVerifiedAgent(true);
      }
    };
    checkAdmin();
  }, [user]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 ">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-800 hover:text-gray-600 transition flex items-center gap-2">
          <span>Dosnine Properties</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          {isSignedIn ? (
            <>
              <Link 
                href="/" 
                className={`px-3 py-2 rounded-lg hover:bg-gray-100 transition text-sm ${router.pathname === '/' ? ' text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Browse
              </Link>
              {isVerifiedAgent ? (
                <>
                  <Link 
                    href="/agent/dashboard" 
                    className={`px-3 py-2 rounded-lg transition text-sm ${router.pathname === '/agent/dashboard' ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <Link 
                  href="/dashboard" 
                  className={`px-3 py-2 rounded-lg transition text-sm ${router.pathname === '/dashboard' ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link 
                  href="/admin/dashboard" 
                  className={`px-3 py-2 rounded-lg transition text-sm ${router.pathname === '/admin/dashboard' ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Admin
                </Link>
              )}
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <Link 
                href="/" 
                className={`px-3 py-2 rounded-lg transition text-sm ${router.pathname === '/' ? ' text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Browse
              </Link>
              <Link 
                href="/dashboard" 
                className={`px-3 py-2 rounded-lg transition text-sm ${router.pathname === '/dashboard' ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button - Show for all users */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <FiMenu size={24} />
        </button>
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
                  className={`px-4 py-3 rounded-lg font-medium ${router.pathname === '/' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Browse Properties
                </Link>
                
                   <Link 
                  href="/agent/signup" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium ${router.pathname === '/tools' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Become an Agent
                </Link>
                
                {/* Public Links - Show for everyone */}
                <Link 
                  href="/properties/new" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium ${router.pathname === '/properties/new' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Post a Property
                </Link>
                
                <Link 
                  href="/request" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium ${router.pathname === '/request' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Request an Agent
                </Link>
                
                <Link 
                  href="/market" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium ${router.pathname === '/market' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Market
                </Link>


                <Link 
                href='/properties/bulk-create'
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium ${router.pathname === '/bulk-create' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Bulk Create
                </Link>
                
             
                
                
                
               
                
              
                
                {/* Divider for authenticated users */}
                {isSignedIn && (
                  <>
                    <div className="border-t border-gray-200 my-2"></div>
                    
                    {isVerifiedAgent ? (
                      <Link 
                        href="/agent/dashboard" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`px-4 py-3 rounded-lg font-medium ${router.pathname === '/agent/dashboard' ? 'bg-accent text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Agent Dashboard
                      </Link>
                    ) : (
                      <Link 
                        href="/dashboard" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`px-4 py-3 rounded-lg font-medium ${router.pathname === '/dashboard' ? 'bg-accent text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Dashboard
                      </Link>
                    )}
                    
                    {isAdmin && (
                      <Link 
                        href="/admin/dashboard" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`px-4 py-3 rounded-lg font-medium ${router.pathname === '/admin/dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Admin
                      </Link>
                    )}
                  </>
                )}
              </div>

              {/* User Section at Bottom */}
              {isSignedIn ? (
                <div className="border-t border-gray-200 p-4">
                  <div className="flex items-center justify-center">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-200 p-4">
                  <Link 
                    href="/dashboard" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full px-4 py-3 bg-accent text-white rounded-lg text-center font-medium hover:bg-accent/90 transition block"
                  >
                    Sign In / Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
