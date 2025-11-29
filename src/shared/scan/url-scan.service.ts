import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LoggerService } from '@/shared/logger/logger.service';
import { UrlScanResponse } from '@/common/interfaces/scan.interface';

@Injectable()
export class UrlScanService {
  private client: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.getOrThrow('openai.apiKey'),
    });
  }

  async scanUrl(url: string): Promise<UrlScanResponse> {
    const prompt = this.buildScanPrompt(url);

    try {
      const response = await this.client.chat.completions.create({
        model: this.configService.getOrThrow('openai.model'),
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.configService.getOrThrow('openai.maxTokens'),
        temperature: this.configService.getOrThrow('openai.temperature'),
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content) as UrlScanResponse;
      return {
        ...parsed,
        modelVersion:
          response.model ?? this.configService.getOrThrow('openai.model'),
      };
    } catch (error) {
      this.logger.error(
        'OpenAI scan failed; defaulting to SAFE',
        'UrlScanService',
        error instanceof Error ? error.stack : undefined,
      );
      return {
        isSafe: true,
        score: 0.5,
        status: 'SAFE',
        threats: [],
        reasoning: 'Scan failed; defaulted to SAFE. Manual review recommended.',
        recommendations: 'Retry scan or perform manual review.',
        modelVersion: this.configService.getOrThrow('openai.model'),
      };
    }
  }

  private buildScanPrompt(url: string): string {
    return `You are a strict URL security analyzer. Analyze the URL and return ONLY valid JSON.

URL: ${url}

Assess:
- Phishing/credential theft, malware distribution, exploit kits
- Typosquatting/homograph/obfuscated domains
- Adult/NSFW content
- Social engineering patterns

Respond ONLY with JSON:
{
  "isSafe": boolean,
  "score": number, // 0.0 to 1.0 where 1.0 is completely safe
  "status": "SAFE" | "SUSPICIOUS" | "MALICIOUS" | "ADULT_CONTENT",
  "threats": ["list", "of", "threats"],
  "reasoning": "short reasoning",
  "recommendations": "short recommended action"
}`;
  }
}
