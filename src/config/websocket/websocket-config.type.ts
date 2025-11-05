export type WebSocketConfig = {
  port: number;
  path: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
  maxHttpBufferSize: number;
  transports: string[];
};
