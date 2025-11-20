"use client";

import Image from "next/image";

export default function HeroWithBackground() {
  return (

      <section className="relative w-full h-[500px]">
        <Image
          src="https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80"
          alt="Dubai Desert"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40">
          <div className="max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
            <h1 className="text-5xl font-bold text-white mb-4">
              DUBAI DESERT SAFARI TOUR
            </h1>
            <p className="text-xl text-white mb-8">
              Experience the magic of the Arabian desert
            </p>
            <button className="w-fit" size="lg">
              Book Now
            </button>
          </div>
        </div>
      </section>

    
  );
}