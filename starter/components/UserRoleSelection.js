import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Home, Search, Users, ArrowRight } from 'lucide-react';

export default function UserRoleSelection() {
  const { user } = useUser();
  const [selectedRole, setSelectedRole] = useState(null);

  const roles = [
    {
      id: 'buyer',
      title: 'Looking for a Property?',
      description: 'Search for houses, apartments, land, and more',
      icon: Search,
      color: 'from-blue-500 to-blue-600',
      link: '/search',
      features: [
        'Browse hundreds of listings',
        'Filter by price, location, type',
        'Save your favorite properties',
        'Contact landlords directly',
      ],
    },
    {
      id: 'landlord',
      title: 'Have a Property to Rent?',
      description: 'List your property and reach thousands of renters',
      icon: Home,
      color: 'from-green-500 to-green-600',
      link: '/landlord/new-property',
      features: [
        'Create property listings',
        'Boost visibility with ads',
        'Manage inquiries easily',
        'Track property performance',
      ],
    },
    {
      id: 'agent',
      title: 'Become a Verified Agent',
      description: 'Help clients find their ideal properties',
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      link: '/agent/signup',
      features: [
        'Serve more clients',
        'Get service requests',
        'Premium visibility',
        'Grow your business',
      ],
    },
    {
      id: 'client',
      title: 'Premium Service Request',
      description: 'Let an agent find properties for you',
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      link: '/service-request',
      features: [
        'Work with verified agents',
        'Get personalized options',
        'Save time and effort',
        '30 days of follow-up',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Welcome{user?.fullName && `, ${user.fullName.split(' ')[0]}`}!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose how you'd like to use DoSnine. Whether you're searching for your dream home, listing a property, or growing your agent business, we're here to help.
          </p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {roles.map(role => {
            const Icon = role.icon;
            return (
              <Link key={role.id} href={role.link}>
                <div className={`h-full bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden group`}>
                  {/* Header with gradient */}
                  <div className={`bg-gradient-to-r ${role.color} p-6 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <Icon className="w-12 h-12 mb-3 relative z-10" />
                    <h2 className="text-2xl font-bold mb-2 relative z-10">{role.title}</h2>
                    <p className="text-white text-opacity-90 relative z-10">{role.description}</p>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    {/* Features List */}
                    <ul className="space-y-2">
                      {role.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-500 mr-3 font-bold mt-0.5">✓</span>
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Button */}
                    <div className="pt-4 border-t border-gray-200 flex items-center justify-between group">
                      <span className={`font-semibold bg-gradient-to-r ${role.color} bg-clip-text text-transparent`}>
                        Get Started
                      </span>
                      <ArrowRight className={`w-5 h-5 text-gray-400 group-hover:translate-x-1 transition`} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-blue-600">
          <h3 className="text-xl font-bold text-gray-800 mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">1</span>
                Choose Your Role
              </h4>
              <p className="text-gray-600 text-sm ml-11">Select how you want to use our platform - whether as a buyer, landlord, or agent.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">2</span>
                Complete Your Profile
              </h4>
              <p className="text-gray-600 text-sm ml-11">Fill in your details and preferences. If you're an agent, submit verification documents.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">3</span>
                Get Access
              </h4>
              <p className="text-gray-600 text-sm ml-11">Start using DoSnine with all features available to your role.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">4</span>
                Achieve Your Goals
              </h4>
              <p className="text-gray-600 text-sm ml-11">Find your perfect property, grow your listings, or expand your client base.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
