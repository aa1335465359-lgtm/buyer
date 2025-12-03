export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY2;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: 'Missing GEMINI_API_KEY2 (Doubao image API key)' });
    }

    let body = req.body || {};
    // Handle Vercel sometimes passing body as string
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {
          console.error("Failed to parse body string", e);
      }
    }

    const { prompt, size, image_base64 } = body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // Construct upstream payload
    // Explicitly check for image_base64 and add it if present
    const payload = {
      model: 'doubao-seedream-4-0-250828',
      prompt,
      size: size || '2K',
      n: 1,
      response_format: 'url',
      stream: false,
      watermark: true,
    };

    if (image_base64 && typeof image_base64 === 'string' && image_base64.length > 100) {
        payload.image_base64 = image_base64;
    }

    const upstreamRes = await fetch(
      'https://ark.cn-beijing.volces.com/api/v3/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await upstreamRes.json();

    if (!upstreamRes.ok) {
      console.error(
        '[Doubao image upstream error]',
        upstreamRes.status,
        data
      );
      return res.status(upstreamRes.status).json({
        error: 'Doubao image upstream error',
        details: data,
      });
    }

    const url = data?.data?.[0]?.url || '';

    return res.status(200).json({ url });
  } catch (err) {
    console.error('[Doubao image proxy internal error]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}