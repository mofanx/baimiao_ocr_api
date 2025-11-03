const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'https://web.baimiaoapp.com';

class BaimiaoClient {
  constructor({ username, password, uuid, login_token: loginToken }) {
    this.username = username;
    this.password = password;
    this.uuid = uuid;
    this.loginToken = loginToken;

    this.http = axios.create({
      baseURL: BASE_URL,
      headers: {
        Host: 'web.baimiaoapp.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      timeout: 15000
    });
  }

  ensureHeaders() {
    this.http.defaults.headers.common['X-AUTH-UUID'] = this.uuid || '';
    this.http.defaults.headers.common['X-AUTH-TOKEN'] = this.loginToken || '';
  }

  async login() {
    this.uuid = this.uuid || uuidv4();
    const payload = {
      username: this.username,
      password: this.password,
      type: /^[0-9]+$/.test(this.username) ? 'mobile' : 'email'
    };
    const headers = {
      ...this.http.defaults.headers.common,
      'X-AUTH-UUID': this.uuid,
      'X-AUTH-TOKEN': ''
    };
    const { data } = await this.http.post('/api/user/login', payload, { headers });
    if (!data?.data?.token) {
      throw new Error(`Login failed: ${JSON.stringify(data)}`);
    }
    this.loginToken = data.data.token;
    this.ensureHeaders();
    return { uuid: this.uuid, loginToken: this.loginToken };
  }

  async ensureAuthorized() {
    if (!this.uuid || !this.loginToken) {
      return this.login();
    }
    this.ensureHeaders();
    return { uuid: this.uuid, loginToken: this.loginToken };
  }

  async recognize(base64Image) {
    await this.ensureAuthorized();

    await this.http.post('/api/user/login/anonymous');

    const permResp = await this.http.post('/api/perm/single', { mode: 'single' });
    if (!permResp?.data?.data?.engine) {
      throw new Error('已经达到今日识别上限，请前往白描手机端开通会员或明天再试');
    }
    const { engine, token } = permResp.data.data;

    const imageDataUrl = `data:image/png;base64,${base64Image}`;
    const hash = crypto.createHash('sha1').update(imageDataUrl, 'utf8').digest('hex');

    const startResp = await this.http.post(`/api/ocr/image/${engine}`, {
      batchId: '',
      total: 1,
      token,
      hash,
      name: 'upload.png',
      size: 0,
      dataUrl: imageDataUrl,
      result: {},
      status: 'processing',
      isSuccess: false
    });

    const jobStatusId = startResp?.data?.data?.jobStatusId;
    if (!jobStatusId) {
      throw new Error(`Failed to start OCR job: ${JSON.stringify(startResp.data)}`);
    }

    // Polling result
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const statusResp = await this.http.get(`/api/ocr/image/${engine}/status`, {
        params: { jobStatusId }
      });
      const statusData = statusResp?.data?.data;
      if (!statusData?.isEnded) {
        continue;
      }
      const words = statusData?.ydResp?.words_result ?? [];
      return words.map((item) => item.words).join('\n');
    }
  }
}

module.exports = { BaimiaoClient };
