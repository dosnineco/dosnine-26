import { FiStar, FiClock } from 'react-icons/fi';
import Link from 'next/link';

export default function BetaBanner({ propertyCount }) {
  // Only show if less than 20 properties
  if (propertyCount >= 20) return null;

  const spotsLeft = 20 - propertyCount;

  return (
    <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white py-4 px-4 border-b-4 border-purple-800">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center md:text-left">
            <FiStar className="w-6 h-6 animate-pulse" />
            <div>
              <h3 className="text-xl font-bold">🎉 Private Beta Now Open</h3>
              <p className="text-sm text-white/90">
                Limited early access • List your property before public launch
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <FiClock className="w-4 h-4" />
                <span className="font-semibold text-sm">
                  Only {spotsLeft} spots left for early adopters
                </span>
              </div>
            </div>
            
            <Link
              href="/landlord/dashboard"
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              List Your Property Free →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
