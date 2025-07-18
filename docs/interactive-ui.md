# Sladify インタラクティブUI実装

SlackのBlock KitとInteractive Componentsを使用して、Difyワークフローの入力フィールドに対応したリッチなUIを提供します。

## 使い方

```
@sladify [ワークフロー名] --interactive
```

## 対応する入力フィールドタイプ

### 1. 短文 (text-input)
- Slackの`plain_text_input`として表示
- 最大256文字まで入力可能
- 1行のテキスト入力

### 2. 段落 (paragraph)
- Slackの`plain_text_input`（multiline）として表示
- 最大1024文字まで入力可能
- 複数行のテキスト入力

### 3. 数値 (number)
- Slackの`number_input`として表示
- 整数または小数の入力
- 最小値・最大値の制限設定可能

### 4. 選択 (select)
- Slackの`static_select`として表示
- ドロップダウンから選択
- 事前定義されたオプションから選択

### 5. 単一ファイル (file)
- ファイル選択ボタンを表示
- Slackにアップロードされたファイルを処理

### 6. ファイルリスト (file-list)
- 複数ファイル選択ボタンを表示
- 複数のファイルをまとめて処理

## アーキテクチャ

### 主要コンポーネント

1. **InteractiveUIBuilder** (`/src/services/interactive-ui-builder.ts`)
   - DifyワークフローメタデータからSlack Block Kitを生成
   - 各入力タイプに対応したUIコンポーネントを構築

2. **DifyMetadataClient** (`/src/services/dify-metadata-client.ts`)
   - Dify APIからワークフローのメタデータを取得
   - ファイルアップロード処理

3. **SlackInteractionHandler** (`/src/services/slack-interaction-handler.ts`)
   - ボタンクリックやフォーム送信などのインタラクションを処理
   - モーダルビューの管理

4. **InteractiveExecuteCommand** (`/src/commands/interactive-execute-command.ts`)
   - インタラクティブモードのコマンド実行
   - フォーム表示とデータ収集

## 実装の流れ

1. ユーザーが `--interactive` フラグ付きでコマンドを実行
2. DifyMetadataClientがワークフローのメタデータを取得
3. InteractiveUIBuilderがSlack用のフォームを生成
4. ユーザーがフォームに入力
5. SlackInteractionHandlerが送信を処理
6. MCPClientを使用してDifyワークフローを実行

## 今後の拡張予定

- [ ] ファイルアップロードの完全実装
- [ ] 入力バリデーションの強化
- [ ] エラーハンドリングの改善
- [ ] プログレス表示の追加
- [ ] 実行結果のリッチな表示