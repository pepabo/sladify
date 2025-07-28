export function markdownToSlack(markdown: string): string {
  // まず、入力がJSON形式かチェック
  try {
    const parsed = JSON.parse(markdown);
    // JSONオブジェクトの場合、キー・バリュー形式で整形
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed);
      return entries.map(([key, value]) => {
        // キーを太字で表示
        const formattedKey = `*${key}*`;
        // 値が文字列の場合はMarkdown変換を適用
        const formattedValue = typeof value === 'string' 
          ? convertMarkdownToSlack(value)
          : String(value);
        return `${formattedKey}\n\n${formattedValue}`;
      }).join('\n\n');
    }
  } catch {
    // JSONパースに失敗した場合は通常のMarkdown変換を行う
  }
  
  return convertMarkdownToSlack(markdown);
}

function convertMarkdownToSlack(markdown: string): string {
  let slackText = markdown;
  
  // Bold - convert ** to * (Markdown bold to Slack bold)
  slackText = slackText.replace(/\*\*(.+?)\*\*/g, '*$1*');
  
  // Note: Slackでは既に *text* = bold, _text_ = italic なので、
  // 単独の * はそのまま残す（Slack形式として正しい）
  
  // Headers - Slack doesn't support headers, so just make them bold
  // Do this after italic conversion to avoid conflicts
  slackText = slackText.replace(/^### (.+)$/gm, '*$1*');
  slackText = slackText.replace(/^## (.+)$/gm, '*$1*');
  slackText = slackText.replace(/^# (.+)$/gm, '*$1*');
  
  // Code blocks - keep ``` as is (Slack supports it)
  // Inline code - keep ` as is (Slack supports it)
  
  // Lists - convert - to • for better readability
  slackText = slackText.replace(/^- (.+)$/gm, '• $1');
  slackText = slackText.replace(/^\* (.+)$/gm, '• $1');
  
  // Numbered lists - keep as is
  
  // Blockquotes - convert > to │ (or just remove the >)
  slackText = slackText.replace(/^> (.+)$/gm, '│ $1');
  
  // Horizontal rules - convert to a line of dashes
  slackText = slackText.replace(/^---+$/gm, '─────────────────────');
  slackText = slackText.replace(/^\*\*\*+$/gm, '─────────────────────');
  
  // Tables - Slack doesn't support tables, so just format them nicely
  // This is a simple approach - for complex tables, might need more work
  // Don't replace | inside < > (Slack links)
  slackText = slackText.replace(/\|(?![^<]*>)/g, '│');
  
  // Links - convert [text](url) to <url|text>
  // Do this after table conversion to preserve the |
  slackText = slackText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');
  
  return slackText;
}