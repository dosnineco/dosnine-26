"use client";

import Image from "next/image";

// Hero 2: Hero with Split Content Layout

export default function HeroSplit() {
    const backgroundImage = "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80";
    return (
      <section className="relative w-full h-[600px] grid grid-cols-2 items-center">
        <div className="relative h-full">
          <Image
            src={backgroundImage}
            alt="Background"
            fill
            className="object-cover opacity-50"
          />
        </div>
        <div className="flex flex-col justify-center px-10">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Unleash Your Inner Explorer
          </h1>
          <p className="text-lg text-gray-700 mb-6">
            Step into the adventure of a lifetime with stunning scenery and unique experiences.
          </p>
          <button className="px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700">
            Learn More
          </button>
        </div>
      </section>
    );
  }