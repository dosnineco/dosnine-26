import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { FireIcon } from "@heroicons/react/24/solid";

export default function BlogScroller() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, summary, coverimageurl, publishedat, is_pinned")
        .eq("ispublished", true)
        .order("is_pinned", { ascending: false })
        .limit(15)
        .order("publishedat", { ascending: false });

      if (error) {
        console.error("Error fetching posts:", error);
      } else {
        setPosts(data || []);
      }
    };

    fetchPosts();
  }, []);

  if (!posts.length) return null;

  return (
    <div className="w-full mt-11 my-8">
        <h2 className="text-xl font-bold text-black  mb-4 flex items-center gap-2">
        <FireIcon className="w-6 h-6 text-orange-500" />
        Editor’s Choice
        </h2>
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex-shrink-0 w-64 bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
          >
            <Link href={`/blog/${post.slug}`}>
              <div>
                {post.coverimageurl && (
                  <img
                    src={post.coverimageurl}
                    alt={post.title}
                    className="w-full h-36 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-md font-semibold text-blue-700 hover:underline line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {post.publishedat
                      ? new Date(post.publishedat).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </p>
                  <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                    {post.summary}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
