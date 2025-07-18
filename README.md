# Sladify

SlackからDifyのワークフローを実行できるボット。DifyのMCP（Model Context Protocol）サーバーエンドポイントをSlackに登録し、Slackのメンションでワークフローを呼び出せる。

## セットアップ

### 1. Slack App作成

1. https://api.slack.com/apps にアクセス
2. 「Create New App」→「From an app manifest」を選択
3. ワークスペースを選択
4. YAMLタブに切り替えて`manifest.yml`の内容を貼り付け
5. 「Create」をクリック
6. 「Install to Workspace」でインストール
7. Basic Information → App-Level Tokens で「Generate Token and Scopes」
   - Token Name: 任意（例: Socket Mode Token）
   - Scope: `connections:write`を追加
   - 「Generate」をクリック

### 2. 環境設定

```bash
cp .env.example .env
```

以下の環境変数を設定:
- `SLACK_BOT_TOKEN`: Bot User OAuth Token
- `SLACK_APP_TOKEN`: App Level Token
- `DATABASE_URL`: SQLiteデータベースパス（デフォルト: `file:./dev.db`）

### 3. インストール

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
```

### 4. 起動

```bash
# 開発環境
pnpm dev

# 本番環境
pnpm build
pnpm start
```

## 使い方

### Difyのワークフローを登録
```
@sladify add weather-bot https://api.dify.ai/mcp/server/xxx/mcp
```

### 登録したワークフローを実行
```
@sladify weather-bot 東京の天気を教えて
```

### コマンド一覧
```
@sladify add [名前] [URL]         # DifyのMCPエンドポイントを登録
@sladify list                     # 登録済みワークフロー一覧
@sladify tool [名前]              # ワークフローのパラメータ情報を表示
@sladify update [名前]            # パラメータ情報を更新
@sladify [名前] [引数...]         # ワークフローを実行
@sladify help                     # ヘルプ表示
```

### 高度な実行例

```
# 複数パラメータがある場合
@sladify translator text="Hello" target_lang="ja"

# JSON値を渡す場合
@sladify analyzer data='{"items": [1,2,3]}'
```

## デプロイ

### Docker

```bash
docker build -t sladify .
docker run -v sladify-data:/data \
  -e SLACK_BOT_TOKEN=xxx \
  -e SLACK_APP_TOKEN=xxx \
  sladify
```

### Fly.io

```bash
fly launch
fly secrets set SLACK_BOT_TOKEN=xxx SLACK_APP_TOKEN=xxx
fly deploy
```

## ライセンス

MIT