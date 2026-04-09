process.on('uncaughtException', (err) => { console.error('UNCAUGHT:', err.message); });
process.on('unhandledRejection', (err) => { console.error('UNHANDLED:', err); });

const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '86008ef6d11a42328873bcb5646ce071.z7Kqc6VLVk1gfbSb';

app.use(express.json({ limit: '10mb' }));

// Serve static index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint
app.post('/api/chat', (req, res) => {
  try {
    const { model, messages, stream } = req.body;
    const isStream = stream !== false;

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
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 WeMoreAI 智能虚拟实验生成平台`);
    console.log(`   本地访问: http://localhost:${PORT}`);
    console.log(`   按 Ctrl+C 停止服务\n`);
  });
}

module.exports = app;
