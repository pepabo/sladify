# Sladify

SlackからDifyのワークフローを実行するボット

## セットアップ

### 1. Slack App作成

1. https://api.slack.com/apps で「Create New App」→「From an app manifest」
2. `manifest.yml`の内容を貼り付けて作成
3. 「Install to Workspace」でインストール
4. App-Level Tokenを生成（scope: `connections:write`）

### 2. 環境設定

```bash
cp .env.example .env
# SLACK_BOT_TOKEN と SLACK_APP_TOKEN を設定
```

### 3. 起動

```bash
pnpm install
pnpm prisma:migrate
pnpm dev
```

## 使い方

```
@sladify add weather https://api.dify.ai/mcp/server/xxx/mcp
@sladify weather 東京の天気
```

## デプロイ (Fly.io)

```bash
fly launch
fly secrets set SLACK_BOT_TOKEN=xxx SLACK_APP_TOKEN=xxx
fly deploy
```