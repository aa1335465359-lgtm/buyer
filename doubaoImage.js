

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

    const { prompt, size, images_base64 } = body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // Construct upstream payload matching Doubao API spec
    const payload = {
      model: 'doubao-seedream-4-5-251128', // Updated model version
      prompt,
      size: size || '2K', // Default square if not specified
      response_format: 'url',
      stream: false,
      watermark: false, // Usually disabled for professional output
      sequential_image_generation: 'disabled'
    };

    // Handle Images (0, 1, or 2 images)
    // The backend now expects 'images_base64' as an array of pure base64 strings
    if (images_base64 && Array.isArray(images_base64) && images_base64.length > 0) {
        // Construct Data URLs
        const imageUrls = images_base64.map(b64 => `data:image/jpeg;base64,${b64}`);
        
        // Pass to standard multi-image field (image_urls)
        // Note: Specific behavior depends on the 4.5 model capability, 
        // but typically it accepts a list for reference/edit tasks.
        payload.image_urls = imageUrls;
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
        JSON.stringify(data)
      );
      // 将上游错误详情返回给前端，方便调试
      return res.status(500).json({
        error: 'Doubao upstream error',
        upstreamStatus: upstreamRes.status,
        details: data,
      });
    }

    // 提取图片 URL
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