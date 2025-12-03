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

    // Construct upstream payload matching Doubao API spec
    const payload = {
      model: 'doubao-seedream-4-0-250828',
      prompt,
      // 如果没有传入 image_base64，则 size 生效；如果有 image，size 通常由原图决定，但传了也不报错
      size: size || '2K', 
      response_format: 'url',
      stream: false,
      watermark: true,
      sequential_image_generation: 'disabled' // 显式禁用连续生成，确保图生图逻辑正确
    };

    // 核心修复：将 image_base64 转换为标准 Data URL 格式放入 image 字段
    if (image_base64 && typeof image_base64 === 'string' && image_base64.length > 100) {
        // 前端 fileToGenerativePart 保证了输出为 jpeg，这里统一加上 jpeg 前缀
        payload.image = `data:image/jpeg;base64,${image_base64}`;
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