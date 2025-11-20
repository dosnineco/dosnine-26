"use client";

import Image from "next/image";

// Hero 3: Minimalist Centered Hero with Subtle Overlay
export default function  HeroMinimal() {
    const backgroundImage = "/mobil-side.png";
    return (
      <section className="relative w-full h-[500px] flex items-center justify-center bg-black bg-opacity-50">
        <Image
          src={backgroundImage}
          alt="Background"
          fill
          className="object-cover opacity-50"
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-center">
          <h1 className="text-5xl font-extrabold text-white mb-4">
            Welcome to Adventure
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Every journey begins with a single step.
          </p>
          <button className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600">
            Get Started
          </button>
        </div>
      </section>
    );
  }