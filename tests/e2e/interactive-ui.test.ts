import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '@slack/bolt';
import { InteractiveUIBuilder } from '../../src/services/interactive-ui-builder.js';
import { DifyMetadataClient } from '../../src/services/dify-metadata-client.js';
import { ValidationService } from '../../src/services/validation-service.js';
import { FileUploadHandler } from '../../src/services/file-upload-handler.js';
import { DifyWorkflowMetadata, DifyInputField } from '../../src/types/dify-types.js';

// モックApp
const mockApp = {
  client: {
    chat: {
      postMessage: vi.fn(),
      update: vi.fn(),
      postEphemeral: vi.fn()
    },
    views: {
      open: vi.fn()
    }
  }
} as unknown as App;

describe('Interactive UI E2E Tests', () => {
  let uiBuilder: InteractiveUIBuilder;
  let metadataClient: DifyMetadataClient;
  let validationService: ValidationService;
  let fileUploadHandler: FileUploadHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    uiBuilder = new InteractiveUIBuilder(mockApp);
    metadataClient = new DifyMetadataClient('test-api-key', 'https://api.test.com');
    validationService = new ValidationService();
    fileUploadHandler = new FileUploadHandler(mockApp);
  });

  describe('UIBuilder - フォーム生成', () => {
    it('全ての入力タイプを含むフォームを正しく生成する', () => {
      const metadata: DifyWorkflowMetadata = {
        id: 'test-workflow',
        name: 'テストワークフロー',
        description: 'これはテスト用のワークフローです',
        inputs: [
          {
            name: 'short_text',
            label: '短文入力',
            type: 'text-input',
            required: true,
            placeholder: '名前を入力',
            maxLength: 50
          },
          {
            name: 'long_text',
            label: '段落入力',
            type: 'paragraph',
            required: false,
            placeholder: '詳細な説明を入力',
            maxLength: 500
          },
          {
            name: 'age',
            label: '年齢',
            type: 'number',
            required: true,
            allowDecimal: false,
            min: 0,
            max: 120
          },
          {
            name: 'category',
            label: 'カテゴリー',
            type: 'select',
            required: true,
            options: [
              { label: '技術', value: 'tech' },
              { label: 'ビジネス', value: 'business' },
              { label: 'その他', value: 'other' }
            ]
          },
          {
            name: 'document',
            label: 'ドキュメント',
            type: 'file',
            required: false,
            allowedTypes: ['.pdf', '.doc', '.docx']
          }
        ]
      };

      const blocks = uiBuilder.buildWorkflowForm(metadata, 'test_callback');

      // ヘッダーブロックの確認
      expect(blocks[0]).toMatchObject({
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'テストワークフロー'
        }
      });

      // 説明ブロックの確認
      expect(blocks[1]).toMatchObject({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'これはテスト用のワークフローです'
        }
      });

      // 各入力フィールドの確認
      const inputBlocks = blocks.slice(2, -1);
      expect(inputBlocks).toHaveLength(5);

      // 送信ボタンの確認
      const actionsBlock = blocks[blocks.length - 1];
      expect(actionsBlock.type).toBe('actions');
      expect(actionsBlock.elements).toHaveLength(2);
      expect(actionsBlock.elements[0].text.text).toBe('実行');
      expect(actionsBlock.elements[1].text.text).toBe('キャンセル');
    });

    it('必須フィールドにアスタリスクが付与される', () => {
      const metadata: DifyWorkflowMetadata = {
        id: 'test',
        name: 'Test',
        inputs: [
          {
            name: 'required_field',
            label: '必須項目',
            type: 'text-input',
            required: true
          },
          {
            name: 'optional_field',
            label: 'オプション項目',
            type: 'text-input',
            required: false
          }
        ]
      };

      const blocks = uiBuilder.buildWorkflowForm(metadata, 'test');
      
      // 必須フィールドのラベル確認
      const requiredInput = blocks.find(b => b.block_id === 'test_required_field');
      expect(requiredInput?.label?.text).toBe('必須項目 *');
      
      // オプションフィールドのラベル確認
      const optionalInput = blocks.find(b => b.block_id === 'test_optional_field');
      expect(optionalInput?.label?.text).toBe('オプション項目');
    });
  });

  describe('Validation - 入力検証', () => {
    const fields: DifyInputField[] = [
      {
        name: 'name',
        label: '名前',
        type: 'text-input',
        required: true,
        maxLength: 20
      },
      {
        name: 'age',
        label: '年齢',
        type: 'number',
        required: true,
        allowDecimal: false,
        min: 0,
        max: 100
      },
      {
        name: 'category',
        label: 'カテゴリー',
        type: 'select',
        required: true,
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' }
        ]
      }
    ];

    it('正しい入力値で検証エラーが発生しない', () => {
      const inputs = {
        name: '山田太郎',
        age: 25,
        category: 'a'
      };

      const errors = validationService.validateInputs(inputs, fields);
      expect(errors).toHaveLength(0);
    });

    it('必須フィールドが空の場合エラーが発生する', () => {
      const inputs = {
        name: '',
        age: 25,
        category: 'a'
      };

      const errors = validationService.validateInputs(inputs, fields);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        field: 'name',
        message: '名前は必須項目です'
      });
    });

    it('文字数制限を超えた場合エラーが発生する', () => {
      const inputs = {
        name: 'あ'.repeat(25),
        age: 25,
        category: 'a'
      };

      const errors = validationService.validateInputs(inputs, fields);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('20文字以内');
    });

    it('数値の範囲外の場合エラーが発生する', () => {
      const inputs = {
        name: '山田太郎',
        age: 150,
        category: 'a'
      };

      const errors = validationService.validateInputs(inputs, fields);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('100以下');
    });

    it('無効な選択肢の場合エラーが発生する', () => {
      const inputs = {
        name: '山田太郎',
        age: 25,
        category: 'invalid'
      };

      const errors = validationService.validateInputs(inputs, fields);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('有効な選択肢から選択');
    });

    it('複数のエラーが同時に検出される', () => {
      const inputs = {
        name: '',
        age: -10,
        category: 'invalid'
      };

      const errors = validationService.validateInputs(inputs, fields);
      expect(errors).toHaveLength(3);
    });
  });

  describe('FileUploadHandler - ファイル処理', () => {
    it('ファイルタイプの検証が正しく動作する', () => {
      const handler = new FileUploadHandler(mockApp);

      // 許可されたファイルタイプ
      expect(handler.validateFileType(
        { name: 'document.pdf', mimetype: 'application/pdf' },
        ['.pdf', '.doc']
      )).toBe(true);

      // 許可されていないファイルタイプ
      expect(handler.validateFileType(
        { name: 'image.jpg', mimetype: 'image/jpeg' },
        ['.pdf', '.doc']
      )).toBe(false);

      // ワイルドカード指定
      expect(handler.validateFileType(
        { name: 'photo.png', mimetype: 'image/png' },
        ['image/*']
      )).toBe(true);
    });

    it('ファイルサイズの検証が正しく動作する', () => {
      const handler = new FileUploadHandler(mockApp);

      // 許可されたサイズ
      expect(handler.validateFileSize(
        { size: 1024 * 1024 }, // 1MB
        1024 * 1024 * 5 // 5MB
      )).toBe(true);

      // 許可されていないサイズ
      expect(handler.validateFileSize(
        { size: 1024 * 1024 * 10 }, // 10MB
        1024 * 1024 * 5 // 5MB
      )).toBe(false);
    });
  });

  describe('統合テスト - ワークフロー実行', () => {
    it('エラーブロックが正しく生成される', () => {
      const errors = [
        { field: 'name', message: '名前は必須項目です' },
        { field: 'age', message: '年齢は0以上である必要があります' }
      ];

      const blocks = validationService.createErrorBlocks(errors);
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0].text.text).toContain('入力エラーがあります');
      expect(blocks[1].text.text).toContain('name');
      expect(blocks[1].text.text).toContain('age');
    });

    it('成功メッセージブロックが正しく生成される', () => {
      const blocks = uiBuilder.buildSuccessMessage('ワークフローが正常に実行されました');
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].text.text).toContain(':white_check_mark:');
      expect(blocks[0].text.text).toContain('ワークフローが正常に実行されました');
    });

    it('ローディングメッセージブロックが正しく生成される', () => {
      const blocks = uiBuilder.buildLoadingMessage('処理中です...');
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].text.text).toContain(':hourglass_flowing_sand:');
      expect(blocks[0].text.text).toContain('処理中です...');
    });
  });
});