// Example in /pages/api/publish-post.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { slug } = req.body;
  const fullUrl = `https://www.expensegoose.com/blog/${slug}`;

  // Save post to database first...

  // Then notify Bing
  await fetch(`https://www.expensegoose.com/api/index-urls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urls: [fullUrl] }),
  });

  res.status(200).json({ success: true });
}
