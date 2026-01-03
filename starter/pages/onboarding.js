import Head from 'next/head';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Home, Users, Search, Shield, Zap, ArrowRight } from 'lucide-react';

export default function AgentsPage() {
  const { user, isLoaded } = useUser();

  return (
    <>
      <Head>
        <title>Property & Agent Services — DoSnine</title>
        <meta name="description" content="Post properties, find agents, or become a verified professional" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Welcome{user ? `, ${user.firstName}` : ''}!
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose how you want to get started
            </p>
          </div>

          {/* Three Main Options */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
            
            {/* Option 1: Post Property Myself */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-green-100 hover:border-green-400 transition-all hover:shadow-2xl group">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Home className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Post Property Myself
              </h2>
              <p className="text-gray-600 mb-6 min-h-[80px]">
                List your rental property directly. Manage everything yourself and reach thousands of potential tenants.
              </p>
              <ul className="space-y-2 mb-8 text-sm">
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Full control of your listing</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Direct tenant communication</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Free to post</span>
                </li>
              </ul>
              <Link
                href="/properties/new"
                className="flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg group"
              >
                Post Property
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition" />
              </Link>
            </div>

            {/* Option 2: Work With Agent */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-100 hover:border-blue-400 transition-all hover:shadow-2xl group">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Work With Agents
              </h2>
              <p className="text-gray-600 mb-6 min-h-[80px]">
                Let verified professionals handle your property listing, marketing, and tenant screening.
              </p>
              <ul className="space-y-2 mb-8 text-sm">
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Expert property marketing</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Professional tenant screening</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Premium service: $49.99</span>
                </li>
              </ul>
              <Link
                href="/service-request"
                className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg group"
              >
                Request an Agent
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition" />
              </Link>
            </div>

            {/* Option 3: Become an Agent */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-purple-100 hover:border-purple-400 transition-all hover:shadow-2xl group">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Become an Agent
              </h2>
              <p className="text-gray-600 mb-6 min-h-[80px]">
                Join our network of verified real estate professionals and receive client leads directly.
              </p>
              <ul className="space-y-2 mb-8 text-sm">
                <li className="flex items-start">
                  <Zap className="w-4 h-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Direct client requests</span>
                </li>
                <li className="flex items-start">
                  <Zap className="w-4 h-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Free registration</span>
                </li>
                <li className="flex items-start">
                  <Zap className="w-4 h-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">24-48 hour verification</span>
                </li>
              </ul>
              <Link
                href="/agent/signup"
                className="flex items-center justify-center w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg group"
              >
                Register as Agent
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition" />
              </Link>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="bg-white rounded-2xl shadow-lg p-12 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-blue-600">
                  1
                </div>
                <h3 className="font-semibold text-lg mb-2">Choose Your Path</h3>
                <p className="text-gray-600">Select whether to post yourself, work with agents, or become one</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-blue-600">
                  2
                </div>
                <h3 className="font-semibold text-lg mb-2">Complete Setup</h3>
                <p className="text-gray-600">Fill out the form with your details - we use your Google info where possible</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-blue-600">
                  3
                </div>
                <h3 className="font-semibold text-lg mb-2">Start Connecting</h3>
                <p className="text-gray-600">Post properties, get agent help, or receive client requests</p>
              </div>
            </div>
          </div>

          {/* User Info Display (if logged in) */}
          {user && (
            <div className="mt-12 max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Signed in as:</strong> {user.fullName || user.firstName}
              </p>
              <p className="text-sm text-blue-700">
                Your information from Google will be pre-filled in forms to save you time!
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
