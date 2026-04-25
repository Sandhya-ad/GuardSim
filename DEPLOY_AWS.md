# Deploy on AWS (App Runner + S3/CloudFront)

This project is split into:
- Frontend (Vite static build)
- Backend (Node/Express API in `backend/server.js`)

## 1) Backend deploy (AWS App Runner)

1. Push repo to GitHub.
2. In AWS Console, open App Runner -> Create service.
3. Source: Container registry OR source code repository.
   - If using source code:
     - Build command: `npm ci`
     - Start command: `node backend/server.js`
     - Port: `8080`
4. Set environment variables:
   - `PORT=8080`
   - `USE_AWS=true`
   - `AWS_REGION=ca-central-1` (or your region)
   - `BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0`
   - `POLLY_VOICE_ID=Joanna`
   - `GUARDSIM_PROGRESS_TABLE=GuardSimProgress`
5. Attach IAM role permissions for:
   - Bedrock Runtime
   - Translate
   - Polly
   - DynamoDB

After deploy, copy your App Runner URL, for example:
`https://xxxx.us-east-1.awsapprunner.com`

## 2) Frontend deploy (S3 + CloudFront)

1. Create `.env.production` in repo root:

```bash
VITE_API_BASE_URL=https://<your-app-runner-url>
```

2. Build frontend:

```bash
npm run build
```

3. Upload `dist/` contents to an S3 bucket.
4. Put CloudFront in front of that bucket.
5. Open CloudFront URL and test full flow.

## 3) Local development commands

- Frontend only: `npm run dev:web`
- Backend only: `npm run dev:api`
- Both: `npm run dev`

## 4) Notes

- Frontend calls API using `VITE_API_BASE_URL` if set.
- If `VITE_API_BASE_URL` is empty, frontend uses relative `/api` (good for local Vite proxy).
