"use client";

import Image from "next/image";

// Hero 4: Hero with Centered Cards
export default function  HeroCards() {
    const backgroundImage = "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80";
    return (
      <section className="relative w-full h-[600px] flex flex-col justify-center items-center bg-gradient-to-t from-gray-900 via-transparent to-gray-900">
        <Image
          src={backgroundImage}
          alt="Background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-center">
          <h1 className="text-5xl font-bold text-white mb-10">
            Discover New Experiences
          </h1>
          <div className="flex gap-6">
            <div className="bg-white p-6 rounded-lg shadow-lg w-[250px]">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Mountains</h3>
              <p className="text-gray-600">Breathtaking views await you.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg w-[250px]">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Beaches</h3>
              <p className="text-gray-600">Relax by the pristine waters.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg w-[250px]">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Deserts</h3>
              <p className="text-gray-600">Feel the magic of the sands.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }