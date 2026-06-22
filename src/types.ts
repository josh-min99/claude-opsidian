export interface UsageEntry {
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface SessionBlock {
  startTime: number;
  endTime: number;
  entries: UsageEntry[];
  totalTokens: number;
  messageCount: number;
}

export interface CurrentWindow {
  isActive: boolean;
  totalTokens: number;
  messageCount: number;
  blockStart: number;
  resetTime: number;
  remainingMs: number;
}
