"use client";

import Image from "next/image";

// Hero 1: Fullscreen Hero with Modern Gradient Overlay
export default function  HeroFullscreen() {
  const backgroundImage ="/mobil-side.png";
  return (
    <section className="relative w-full h-screen">
      <Image
        src={backgroundImage}
        alt="Background"
        fill
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black">
        <div className="max-w-7xl mx-auto px-6 h-full flex flex-col justify-center items-center text-center">
          <h1 className="text-6xl font-extrabold text-white mb-4">
            EXPLORE NEW HORIZONS
          </h1>
          <p className="text-2xl text-gray-300 mb-6">
            Discover breathtaking destinations around the globe.
          </p>
          <button className="px-8 py-4 bg-yellow-500 text-black font-semibold rounded-full shadow-lg hover:bg-yellow-600">
            Start Your Journey
          </button>
        </div>
      </div>
    </section>
  );
}