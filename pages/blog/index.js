import { useState } from "react";
import { supabase } from "../../lib/supabase";
import Head from "next/head";
import Link from "next/link";

const POSTS_PER_PAGE = 10;

export async function getStaticProps() {
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, slug, summary, coverimageurl, publishedat")
    .eq("ispublished", true)
    .order("publishedat", { ascending: false });

  return {
    props: { posts: data || [] },
    revalidate: 60,
  };
}

export default function BlogIndex({ posts }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);

  const paginatedPosts = posts.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE
  );

  return (
    <>
      <Head>
        <title>Blog | Expense Goose</title>
        <meta name="description" content="Read the latest posts from Expense Goose." />
      </Head>
      <main className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Blog | Expense Goose</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {paginatedPosts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col bg-white border border-gray-200 rounded-lg p-0 transition"
            >
              <Link href={`/blog/${post.slug}`} className="block group">
                {post.coverimageurl && (
                  <img
                    src={post.coverimageurl}
                    alt={post.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
                <div className="p-5">
                  <h2 className="text-xl font-bold text-blue-700 group-hover:underline mb-2">
                    {post.title}
                  </h2>
                  {post.summary && (
                    <p className="text-base text-gray-700 mb-2 line-clamp-3">{post.summary}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">
                    {post.publishedat && !isNaN(new Date(post.publishedat))
                      ? new Date(post.publishedat).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Unknown date"}
                  </p>
              
                </div>
              </Link>
            </div>
          ))}
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="flex justify-center items-center gap-2 mt-10">
            <button
              className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-blue-100 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx}
                className={`px-3 py-1 rounded ${
                  page === idx + 1
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-blue-100"
                }`}
                onClick={() => setPage(idx + 1)}
              >
                {idx + 1}
              </button>
            ))}
            <button
              className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-blue-100 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </nav>
        )}
      </main>
    </>
  );
}