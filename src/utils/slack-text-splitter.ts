/**
 * Slackのテキストブロックの文字数制限（3000文字）に対応するためのテキスト分割ユーティリティ
 */

const SLACK_TEXT_LIMIT = 3000;
const SAFE_LIMIT = 2900; // 余裕を持たせる

/**
 * 長いテキストをSlackの制限に収まるように分割
 * @param text 分割するテキスト
 * @param limit 文字数制限（デフォルト: 2900）
 * @returns 分割されたテキストの配列
 */
export function splitTextForSlack(text: string, limit: number = SAFE_LIMIT): string[] {
  if (text.length <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  
  // 改行で分割して処理
  const lines = text.split('\n');
  
  for (const line of lines) {
    // 1行が制限を超える場合は強制的に分割
    if (line.length > limit) {
      // 現在のチャンクを保存
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      // 長い行を文字数で分割
      let remaining = line;
      while (remaining.length > 0) {
        chunks.push(remaining.substring(0, limit));
        remaining = remaining.substring(limit);
      }
    } else if (currentChunk.length + line.length + 1 > limit) {
      // 現在のチャンクに追加すると制限を超える場合
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      // 現在のチャンクに追加
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  
  // 最後のチャンクを追加
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * テキストを分割してSlackブロックの配列を生成
 * @param text 分割するテキスト
 * @param prefix 各ブロックの前に付けるテキスト（オプション）
 * @returns Slackブロックの配列
 */
export function createTextBlocks(text: string, prefix?: string): any[] {
  const chunks = splitTextForSlack(text);
  const blocks: any[] = [];
  
  chunks.forEach((chunk, index) => {
    if (index === 0 && prefix) {
      // 最初のブロックにのみprefixを付ける
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: prefix
        }
      });
    }
    
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: chunk
      }
    });
    
    // 最後のチャンク以外は区切り線を入れる
    if (index < chunks.length - 1) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '_（続く...）_'
          }
        ]
      });
    }
  });
  
  return blocks;
}