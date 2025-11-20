
import React from 'react';

const HeroCentered  = () => {
  return (
    <section className="w-full flex flex-col items-center justify-center h-screen bg-zinc-900 text-white text-center">
    <h1 className=" text-3xlsm:text-5xl  lg:text-8xl font-bold mb-4">
      Get a Website <span className="text-orange-600">in hours</span>! <br />
      Not in <span className="line-through text-red-600">weeks</span>!
    </h1>
    <p className="text-lg sm:text-xl mb-6">
      Service-based business Template paired with 5+ workflow tools for only <strong>$178USD/1yr</strong>.
    </p>
    <div className="flex flex-col sm:flex-row gap-4 text-bold">
  <a
    href="https://7617327545561.gumroad.com/l/yrccb"
    className="rounded-lg text-white bg-blue-500 p-4 shadow-lg transform hover:translate-y-1 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-200 ease-in-out btn-primary"
  >
    Buy Template
  </a>
  <a
    href="/register"
    className="rounded-lg text-white bg-yellow-500 p-4 shadow-lg transform hover:translate-y-1 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-200 ease-in-out btn-secondary"
  >
    Register Here
  </a>
</div>

  </section>
  );
};

export default HeroCentered ;
