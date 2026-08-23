export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  tokens_used: number;
}

export async function processChat(messages: ChatMessage[]): Promise<ChatResponse> {
  return { message: 'AI analysis complete.', tokens_used: 0 };
}

export async function sendMessage(message: string, context?: string): Promise<string> {
  return 'AI response placeholder';
}

export default { processChat, sendMessage };
