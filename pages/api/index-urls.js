// /pages/api/index-urls.ts or .js

export default async function handler(req, res) {
  const { urls } = req.body;

  const INDEXNOW_KEY = 'd0b0dbe1202c44cb8bc5a0cb8ff4d812';
  const KEY_LOCATION = `https://www.expensegoose.com/${INDEXNOW_KEY}.txt`;

  if (!Array.isArray(urls)) {
    return res.status(400).json({ error: 'URLs should be an array' });
  }

  const indexNowPayload = {
    host: 'expensegoose.com',
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  };

  const indexNowResponse = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(indexNowPayload),
  });

  const resultText = await indexNowResponse.text(); // IndexNow may not return JSON
  const indexNowSuccess = indexNowResponse.status === 200;

  const results = urls.map((url) => ({
    url,
    status: indexNowSuccess ? 'Submitted to IndexNow' : `Failed: ${resultText}`,
  }));

  return res.status(200).json({ results });
}
