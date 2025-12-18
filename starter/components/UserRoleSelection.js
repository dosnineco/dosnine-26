import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Search, Users, ArrowRight } from 'lucide-react';

export default function UserRoleSelection() {
  const { user, isLoaded } = useUser();
  const { redirectToSignIn } = useClerk();
  const router = useRouter();

  const roles = [
 
    {
      id: 'landlord',
      title: 'List Property',
      subtitle: 'Rent or sell',
      description: 'Post your property and connect with renters',
      icon: Home,
      color: 'green',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      textColor: 'text-green-600',
      link: '/landlord/new-property',
      cta: 'Post Property',
    },
    {
      id: 'agent',
      title: 'Become Agent',
      subtitle: 'Verified pros',
      description: 'Get client requests and grow your business',
      icon: Users,
      color: 'purple',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      textColor: 'text-purple-600',
      link: '/agent/signup',
      cta: 'Sign Up',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
  
        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {roles.map(role => {
            const Icon = role.icon;
            
            const handleClick = (e) => {
              if (!isLoaded) return;
              
              // If user is signed in, navigate directly
              if (user) {
                router.push(role.link);
              } else {
                // Store intended destination and redirect to sign-in
                e.preventDefault();
                sessionStorage.setItem('redirectAfterSignIn', role.link);
                redirectToSignIn({
                  redirectUrl: role.link
                });
              }
            };
            
            return (
              <div key={role.id} onClick={handleClick}>
                <div className={`${role.bgColor} ${role.hoverColor} border-2 border-transparent hover:border-gray-200 rounded-2xl p-8 text-center transition-all cursor-pointer group h-full flex flex-col`}>
                  {/* Icon */}
                  <div className={`w-16 h-16 ${role.textColor} bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:shadow-md transition`}>
                    <Icon className="w-8 h-8" />
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {role.title}
                  </h2>
                  <p className={`text-sm font-medium ${role.textColor} mb-3`}>
                    {role.subtitle}
                  </p>

                  {/* Description */}
                  <p className="text-gray-600 mb-6 flex-grow">
                    {role.description}
                  </p>

                  {/* CTA Button */}
                  <button className={`w-full ${role.textColor} bg-white hover:bg-white/80 font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md`}>
                    {role.cta}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Info */}
        <div className="text-center bg-gray-50 rounded-xl p-6">
          <p className="text-sm text-gray-600">
            <strong className="text-gray-900">Not sure?</strong> You can always switch roles later. 
            Regular users get <strong>2 free listings</strong>, agents get unlimited listings and client leads.
          </p>
        </div>
      </div>
    </div>
  );
}
