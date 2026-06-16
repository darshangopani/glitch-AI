export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface GlitchState {
  isListening: boolean;
  isProcessing: boolean;
  error: string | null;
}
