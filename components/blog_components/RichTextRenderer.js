import React, { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import YouTubeVideo from "../Misc/YouTubeVideo";

// Replace YouTube links with divs for later rendering
function replaceYouTubeLinks(html) {
  return html.replace(
    /<a [^>]*href="(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^"]+)"[^>]*>[^<]*<\/a>/g,
    (_, url) => `<div data-yt-url="${url}"></div>`
  );
}

// Replace `quote` style backtick usage with <blockquote>
function replaceBacktickQuotes(html) {
  return html.replace(/`([^`]+)`/g, '<blockquote>$1</blockquote>');
}

// Renders HTML with embedded YouTube players
function renderWithYouTube(html) {
  const parts = html.split(/(<div data-yt-url="[^"]+"><\/div>)/g);
  return parts.map((part, i) => {
    const ytMatch = part.match(/<div data-yt-url="([^"]+)"><\/div>/);
    if (ytMatch) {
      return <YouTubeVideo key={i} url={ytMatch[1]} />;
    }
    return (
      <span
        key={i}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(part) }}
      />
    );
  });
}

export default function RichTextRenderer({ html }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  let styledHtml = html;

  // Add Tailwind classes to major HTML elements
  styledHtml = styledHtml
    .replace(/<h1>/g, '<h1 class="text-3xl font-bold text-center mb-6">')
    .replace(/<h2>/g, '<h2 class="text-2xl font-semibold mb-4">')
    .replace(/<h3>/g, '<h3 class="text-xl font-semibold mb-4">')
    .replace(/<p>/g, '<p class="text-lg text-gray-700 mb-4">')
    .replace(/<ul>/g, '<ul class="list-disc list-inside space-y-1 pl-5 mb-4 text-base">')
    .replace(/<ol>/g, '<ol class="list-decimal list-inside space-y-1 pl-5 mb-4 text-base">')
    .replace(/<li>/g, '<li class="leading-relaxed">')
    .replace(/<a href="([^"]+)">/g, '<a href="$1" class="text-blue-600 hover:underline">')
    .replace(/<img /g, '<img class="max-w-full h-auto mx-auto my-4 rounded" ')
    .replace(/<table/g, '<table class="table-auto border-collapse w-full my-4 border border-gray-300"')
    .replace(/<th/g, '<th class="border border-gray-300 bg-gray-100 px-4 py-2 text-left"')
    .replace(/<td/g, '<td class="border border-gray-300 px-4 py-2"');

  styledHtml = replaceYouTubeLinks(styledHtml);
  styledHtml = replaceBacktickQuotes(styledHtml); // backtick quote → <blockquote>

  return (
    <div className="prose max-w-none">
      {renderWithYouTube(styledHtml)}
    </div>
  );
}
