# Node.js 版本白描 OCR API

## 准备工作
1. 复制项目根目录下的 `config.ini.example` 为 `config.ini`，填写白描账号信息：
   ```ini
   [defaults]
   username = 你的账号
   password = 你的密码
   login_token =
   uuid =
   api_key = 可选：若不使用环境变量配置鉴权密钥
   ```
2. 可选：复制 `node_api/.env.example` 为 `node_api/.env`，填写以下变量（优先级高于 `config.ini`）：
   ```env
   BAIMIAO_USERNAME=
   BAIMIAO_PASSWORD=
   BAIMIAO_API_KEY=
   PORT=8000
   ```

## 安装依赖
在 `node_api` 目录下执行（推荐使用 pnpm）：
```bash
pnpm install
```

## 启动服务
1. 开发模式（监听变动自动重启，需全局或本地安装 `nodemon`）：
   ```bash
   pnpm run start:dev
   ```
2. 生产模式：
   ```bash
   pnpm start
   ```

服务默认监听 `PORT`（默认 8000）。

## API 调用示例
- 图片 URL:
  ```bash
  curl -X POST "http://localhost:8000/ocr" \
       -H "Authorization: Bearer ${BAIMIAO_API_KEY}" \
       -H "Content-Type: application/json" \
       -d '{"image_url": "https://example.com/sample.png"}'
  ```
- 上传图片文件：
  ```bash
  curl -X POST "http://localhost:8000/ocr" \
       -H "Authorization: Bearer ${BAIMIAO_API_KEY}" \
       -F "file=@/path/to/image.png"
  ```

返回为纯文本，保持换行格式。健康检查端点：`GET /healthz`。

## 注意事项
- 鉴权采用固定密钥，需提前在环境变量或配置文件中设置。
- 服务会自动缓存并刷新 `uuid` 与 `login_token`，写回项目根目录的 `config.ini`。
- 若需要使用 PM2 守护，先创建日志目录 `mkdir -p logs`，然后在 `node_api` 目录执行：
```bash
pm2 start ecosystem.config.js
```
可通过 `pm2 logs baimiao-ocr` 查看日志，停用或重启使用 `pm2 stop|restart baimiao-ocr`。
