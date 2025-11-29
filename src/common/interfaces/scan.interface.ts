export interface UrlScanDetails {
  isSafe: boolean;
  threats: string[];
  reasoning: string;
  recommendations: string;
}

export type UrlScanStatus =
  | 'SAFE'
  | 'SUSPICIOUS'
  | 'MALICIOUS'
  | 'ADULT_CONTENT';

export type UrlScanResponse = {
  isSafe: boolean;
  score: number;
  status: UrlScanStatus;
  threats: string[];
  reasoning: string;
  recommendations?: string;
  modelVersion?: string;
};
