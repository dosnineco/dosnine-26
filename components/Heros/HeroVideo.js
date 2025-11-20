// Hero 5: Hero with Modern Video Background
export default function HeroVideo() {
    return (
      <section className="relative w-full h-[500px]">
        <video
          autoPlay
          loop
          muted
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/sample-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            Your Next Adventure Awaits
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Explore the world, one destination at a time.
          </p>
          <button className="px-6 py-3 bg-red-500 text-white font-semibold rounded-full hover:bg-red-600">
            Explore Now
          </button>
        </div>
      </section>
    );
  }