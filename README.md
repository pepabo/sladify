# Sladify - DifyワークフローをSlackボット化するプラットフォーム

Sladifyは、Difyで作成したAIワークフローを誰でも簡単にSlackボットとして公開・利用できるようにするプラットフォームです。

## 🎯 なぜSladifyが必要か？

### 現状の課題
- Difyで素晴らしいAIワークフローを作っても、チームメンバーが使うには技術的なハードルがある
- APIを叩いたり、専用のUIを作ったりする必要がある
- 非技術者にとってはアクセスが困難

### Sladifyが解決すること
- **ノーコードでボット化**: DifyのワークフローURLを登録するだけでSlackボット化
- **誰でも使える**: Slackでメンションするだけで高度なAI機能を利用可能
- **リッチなUI**: パラメータ入力用のフォームを自動生成、使いやすいインターフェース

## 🚀 主な特徴

### 1. 簡単なセットアップ
Difyで作ったワークフローのURLを登録するだけ：
```
@sladify add translation-bot https://api.dify.ai/v1/workflows/xxx
```

### 2. 自動的にリッチUIを生成
- ワークフローの入力パラメータに基づいて、Slack用のフォームを自動生成
- テキスト、数値、選択肢など、様々な入力タイプをサポート
- 必須項目やバリデーションも自動設定

### 3. 柔軟な実行方法
- **フォーム実行**: `@sladify translation-bot` でインタラクティブなフォームを表示
- **ダイレクト実行**: `@sladify translation-bot "Hello World"` で即座に実行

## 📖 ドキュメント

- **[ユーザーガイド](./docs/USER_GUIDE.md)**: エンドユーザー向けの使い方ガイド
- **[管理者ガイド](./docs/ADMIN_GUIDE.md)**: ワークフローの登録・管理方法
- **[開発者ガイド](./docs/DEVELOPER_GUIDE.md)**: セットアップとカスタマイズ

## 💡 ユースケース

### 1. 翻訳ボット
Difyで多言語翻訳ワークフローを作成し、Slackから簡単に利用：
```
@sladify translate "こんにちは"
→ Hello (English), 你好 (Chinese), Bonjour (French)
```

### 2. データ分析ボット
複雑なデータ分析ワークフローも、フォーム入力で簡単実行：
```
@sladify analyze-sales
→ [期間や対象を選択するフォームが表示]
→ 分析結果をグラフ付きで返信
```

### 3. カスタマーサポートボット
FAQや問い合わせ対応を自動化：
```
@sladify support "パスワードを忘れました"
→ パスワードリセットの手順を説明
```

## 🛠️ クイックスタート

### 前提条件
- Node.js 18以上
- Slack ワークスペースの管理者権限
- Dify アカウントとAPIキー

### インストール

1. リポジトリをクローン
```bash
git clone https://github.com/your-org/sladify.git
cd sladify
```

2. 環境変数を設定
```bash
cp .env.example .env
# .envファイルを編集して必要な情報を入力
```

3. 依存関係をインストール
```bash
npm install
```

4. データベースをセットアップ
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. 起動
```bash
npm run dev
```

詳細なセットアップ手順は[開発者ガイド](./docs/DEVELOPER_GUIDE.md)を参照してください。

## 🏗️ アーキテクチャ

Sladifyは以下の技術スタックで構築されています：

- **Backend**: Node.js + TypeScript
- **Slack連携**: Bolt for JavaScript
- **Dify連携**: REST API + MCP (Model Context Protocol)
- **データベース**: SQLite (開発) / PostgreSQL (本番)
- **UI生成**: Slack Block Kit

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更を行う場合は、まずissueを作成して変更内容について議論してください。

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](./LICENSE)ファイルを参照してください。

## 🙏 謝辞

- [Dify](https://dify.ai/) - 素晴らしいワークフロー作成プラットフォーム
- [Slack](https://slack.com/) - 最高のチームコミュニケーションツール
- すべてのコントリビューターとユーザーの皆様