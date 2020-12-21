export default function politely(config: {
  services: {
    start(): Promise<void>;
    stop(): Promise<void>;
  }[],
  timeout?: number;
  logger?: {
    error(message: string): void;
    info(message: string): void;
    warn(message: string): void;
  };
}): Promise<void>;
