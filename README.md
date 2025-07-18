# Sladify - Slack Bot for Dify MCP Integration

SlackからDifyワークフローをインタラクティブに実行できるボットです。

## 機能

### インタラクティブUI
- **自動フォーム生成**: Difyワークフローの入力フィールドに基づいて、Slack用のフォームを自動生成
- **スマートなUX**: 引数なしで実行するとフォーム表示、引数ありでダイレクト実行
- **豊富な入力タイプサポート**:
  - 短文（text-input）: 最大256文字の1行入力
  - 段落（paragraph）: 最大1024文字の複数行入力
  - 数値（number）: 整数・小数の入力、範囲指定可能
  - 選択（select）: ドロップダウンから選択
  - ファイル（file/file-list）: ファイルアップロード対応

### バリデーション
- 必須フィールドチェック
- 文字数制限
- 数値範囲チェック
- ファイルタイプ・サイズ検証
- リアルタイムエラー表示

## 使い方

### 基本コマンド
```bash
# MCPサーバー登録
@sladify add weather https://api.dify.ai/v1/workflows/xxx

# ワークフロー一覧
@sladify list

# インタラクティブ実行（フォーム表示）
@sladify weather

# ダイレクト実行（引数指定）
@sladify weather location=Tokyo units=celsius
```

### セットアップ

1. 環境変数の設定
```bash
cp .env.example .env
# 以下を編集
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_APP_TOKEN=xapp-xxx
DATABASE_URL=file:./dev.db  # 開発環境
DIFY_API_KEY=app-xxx
DIFY_BASE_URL=https://api.dify.ai/v1
```

2. 依存関係インストール
```bash
npm install
```

3. データベースセットアップ
```bash
npm run prisma:generate
npm run prisma:migrate
```

4. 起動
```bash
npm run dev
```

## アーキテクチャ

### 主要コンポーネント
- **InteractiveUIBuilder**: Slack Block Kit形式のフォーム生成
- **DifyMetadataClient**: Difyワークフローのメタデータ取得
- **ValidationService**: 入力値の検証
- **FileUploadHandler**: ファイルアップロード処理
- **SlackInteractionHandler**: ボタンクリックなどのインタラクション処理

### テスト
```bash
# テスト実行
npm run test

# カバレッジ付き
npm run test:coverage
```

## 開発状況

✅ 実装済み
- Slack Block KitによるインタラクティブUI
- Difyワークフローメタデータ連携
- 全入力タイプのサポート
- バリデーション機能
- ファイルアップロード処理
- E2Eテスト

🚧 今後の予定
- Dify実際のAPIエンドポイント確認
- ストリーミングレスポンスの改善
- 複数ワークフローの同時実行サポート