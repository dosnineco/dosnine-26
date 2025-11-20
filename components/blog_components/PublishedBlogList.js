import Link from "next/link";

export default function PublishedBlogList({ posts }) {
  const published = posts.filter((post) => post.ispublished);

  if (published.length === 0) {
    return <div className="mt-8 text-gray-500">No published posts yet.</div>;
  }

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">Published Posts</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        {published.map((post) => (
          <li key={post.id} className="mb-2">
            <Link href={`/blog/${post.slug}`}>
              <span className="text-blue-600 hover:underline font-semibold">{post.title}</span>
            </Link>
            <span className="ml-2 text-gray-500 text-sm">
              {post.publishedat ? new Date(post.publishedat).toLocaleDateString() : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}