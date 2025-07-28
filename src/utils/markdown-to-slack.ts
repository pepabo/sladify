export function markdownToSlack(markdown: string): string {
  let slackText = markdown;
  
  // Bold - convert ** to * first
  slackText = slackText.replace(/\*\*(.+?)\*\*/g, '*$1*');
  
  // Italic - convert single * or _ to _
  slackText = slackText.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '_$1_');
  slackText = slackText.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '_$1_');
  
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