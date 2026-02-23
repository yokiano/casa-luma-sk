export interface AlertPublishPayload {
  title: string;
  body: string;
  parseMode?: 'HTML' | 'MarkdownV2';
}

export interface AlertPublisher {
  publish: (payload: AlertPublishPayload) => Promise<void>;
}
