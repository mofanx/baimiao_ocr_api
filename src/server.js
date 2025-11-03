require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');

const { ConfigStore } = require('./configStore');
const { BaimiaoClient } = require('./baimiaoClient');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const configStore = new ConfigStore();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

function getApiKey() {
  return (process.env.BAIMIAO_API_KEY || configStore.get('api_key', '')).trim();
}

function getCredentials() {
  return {
    username: process.env.BAIMIAO_USERNAME || configStore.get('username', ''),
    password: process.env.BAIMIAO_PASSWORD || configStore.get('password', ''),
    uuid: configStore.get('uuid', ''),
    login_token: configStore.get('login_token', '')
  };
}

function persistCredentials({ uuid, loginToken }) {
  if (uuid) {
    configStore.set('uuid', uuid);
  }
  if (loginToken) {
    configStore.set('login_token', loginToken);
  }
}

function normalizeBase64(raw) {
  if (typeof raw !== 'string') {
    throw new Error('image_base64 must be string');
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('image_base64 is empty');
  }
  const marker = 'base64,';
  const payload = trimmed.includes(marker) ? trimmed.split(marker)[1] : trimmed;
  if (!payload) {
    throw new Error('image_base64 payload is empty');
  }
  return payload;
}

async function fetchImageAsBase64(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
    throw new Error('image_url is required');
  }
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

async function extractImagePayload(req) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.toLowerCase().includes('multipart/form-data')) {
    if (req.file) {
      if (!req.file.buffer || !req.file.buffer.length) {
        throw new Error('uploaded file is empty');
      }
      return { base64: req.file.buffer.toString('base64'), source: 'upload' };
    }
    if (req.body.image_base64) {
      return { base64: normalizeBase64(req.body.image_base64), source: 'form_base64' };
    }
    if (req.body.image_url) {
      const base64 = await fetchImageAsBase64(req.body.image_url);
      return { base64, source: 'form_url' };
    }
    throw new Error('multipart/form-data requires file, image_base64 or image_url');
  }

  if (req.body && typeof req.body === 'object') {
    if (req.body.image_base64) {
      return { base64: normalizeBase64(req.body.image_base64), source: 'json_base64' };
    }
    if (req.body.image_url) {
      const base64 = await fetchImageAsBase64(req.body.image_url);
      return { base64, source: 'json_url' };
    }
  }

  throw new Error('Request must include image_base64 or image_url');
}

function ensureAuthorized(req, res, next) {
  const expected = getApiKey();
  if (!expected) {
    return res.status(500).json({ error: 'API key is not configured' });
  }
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim();
  if (!token || token !== expected) {
    return res.status(401).json({ error: 'Invalid Authorization token' });
  }
  next();
}

app.post('/ocr', ensureAuthorized, upload.single('file'), async (req, res) => {
  try {
    const { base64 } = await extractImagePayload(req);
    const credentials = getCredentials();
    if (!credentials.username || !credentials.password) {
      return res.status(500).json({ error: 'Username or password not configured' });
    }

    const client = new BaimiaoClient(credentials);
    const { uuid, loginToken } = await client.ensureAuthorized();
    persistCredentials({ uuid, loginToken });

    const text = await client.recognize(base64);
    persistCredentials({ uuid: client.uuid, loginToken: client.loginToken });

    res.type('text/plain').send(text);
  } catch (error) {
    console.error('[OCR_ERROR]', error.message);
    res.status(502).json({ error: `OCR failed: ${error.message}` });
  }
});

const port = Number(process.env.PORT) || 8000;

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', port });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Node OCR API listening on port ${port}`);
  });
}

module.exports = app;
