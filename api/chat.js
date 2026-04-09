const https = require('https');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { model, messages, stream } = req.body;
    const isStream = stream !== false;

    const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '86008ef6d11a42328873bcb5646ce071.z7Kqc6VLVk1gfbSb';

    const postData = JSON.stringify({
      model: model || 'glm-4-flash',
      messages,
      stream: isStream,
      temperature: 0.7,
      max_tokens: 8192
    });

    const options = {
      hostname: 'open.bigmodel.cn',
      port: 443,
      path: '/api/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const apiReq = https.request(options, (apiRes) => {
      if (apiRes.statusCode !== 200) {
        let errBody = '';
        apiRes.on('data', c => errBody += c);
        apiRes.on('end', () => res.status(apiRes.statusCode).json({ error: errBody }));
        return;
      }
      if (isStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        apiRes.pipe(res);
      } else {
        let body = '';
        apiRes.on('data', c => body += c);
        apiRes.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          res.send(body);
        });
      }
    });

    apiReq.on('error', (err) => {
      console.error('API request error:', err.message);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

    apiReq.write(postData);
    apiReq.end();
  } catch (e) {
    console.error('Server error:', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
};
