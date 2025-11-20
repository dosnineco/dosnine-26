import React from 'react';
import YouTube from 'react-youtube';

// Function to extract the video ID from the YouTube URL
const extractVideoId = (url) => {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const YouTubeVideo = ({ url }) => {
  const videoId = extractVideoId(url);
  if (!videoId) {
    return <div>Invalid YouTube URL</div>;
  }

  // Options for YouTube player
  const mobileOpts = {
    height: '200',
    width: '320',
    playerVars: {
      autoplay: 3,
    },
  };

  const desktopOpts = {
    height: '320',
    width: '550',
    playerVars: {
      autoplay: 3,
    },
  };

  return (
    <div className=" mb-3 sm:mt-10 flex justify-center">
      {/* Responsive container */}
      <div className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl">
        {/* Mobile view */}
        <div className="block  mt-4  sm:hidden">
          <YouTube videoId={videoId} opts={mobileOpts} />
        </div>
        {/* Desktop view */}
        <div className="hidden sm:block">
          <YouTube videoId={videoId} opts={desktopOpts} />
        </div>
      </div>
    </div>
  );
};

export default YouTubeVideo;