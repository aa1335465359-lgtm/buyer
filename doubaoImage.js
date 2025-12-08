
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Trim key to avoid header issues with accidental whitespace/newlines
    const apiKey = (process.env.GEMINI_API_KEY2 || '').trim();
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

    const { prompt, size, images_base64, watermark } = body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // 1. Construct Base Payload (Strictly matching provided curl for T2I)
    const payload = {
      model: 'doubao-seedream-4-5-251128',
      prompt,
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: size || '2K',
      stream: false,
      // Default watermark to false if not provided, allowing override from frontend if needed
      watermark: typeof watermark === 'boolean' ? watermark : false
    };

    // 2. Handle Reference Images (I2I)
    // Check for non-empty array
    if (Array.isArray(images_base64) && images_base64.length > 0) {
        const imageUrls = images_base64.map(b64 => {
            // Ensure Data URL format
            if (b64.startsWith('data:')) return b64;
            return `data:image/jpeg;base64,${b64}`;
        });
        
        // Use 'image' field (matches curl example and Turn 1 instruction)
        // Sending as an array of strings
        payload.image = imageUrls;
    }

    // 3. Call Upstream
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

    // 4. Handle Errors
    if (!upstreamRes.ok) {
      console.error(
        '[Doubao image upstream error]',
        upstreamRes.status,
        JSON.stringify(data)
      );
      return res.status(500).json({
        error: 'Doubao upstream error',
        upstreamStatus: upstreamRes.status,
        details: data,
      });
    }

    // 5. Extract Result
    const url = data?.data?.[0]?.url;
    
    if (!url) {
        return res.status(500).json({ error: 'No image URL in response', raw: data });
    }

    return res.status(200).json({ url });
  } catch (err) {
    console.error('[Doubao image proxy internal error]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
