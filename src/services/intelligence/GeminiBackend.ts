/**
 * Gemini Backend Provider
 * 
 * Provides LLM-based reasoning capabilities using Gemini AI.
 */

import axios, { AxiosInstance } from 'axios';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface GeminiRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  success: boolean;
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

/**
 * Gemini Backend for LLM-based analysis
 */
export class GeminiBackend {
  private config: GeminiConfig;
  private client: AxiosInstance;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: GeminiConfig) {
    this.config = {
      model: 'gemini-pro',
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.95,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate a completion using Gemini
   */
  async generateCompletion(request: GeminiRequest): Promise<GeminiResponse> {
    try {
      const response = await this.client.post(
        `/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: request.systemPrompt
                    ? `${request.systemPrompt}\n\n${request.prompt}`
                    : request.prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: request.temperature ?? this.config.temperature,
            maxOutputTokens: request.maxTokens ?? this.config.maxTokens,
            topP: this.config.topP,
          },
        }
      );

      const candidate = response.data.candidates?.[0];
      const content = candidate?.content;
      const text = content?.parts?.[0]?.text || '';

      // Extract usage metadata if available
      const usage = response.data.usageMetadata
        ? {
            promptTokens: response.data.usageMetadata.promptTokenCount || 0,
            completionTokens: response.data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.data.usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      return {
        success: true,
        text,
        usage,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg =
          error.response?.data?.error?.message || error.message || 'Unknown error';
        console.error('❌ Gemini API error:', errorMsg);
        return {
          success: false,
          text: '',
          error: errorMsg,
        };
      }

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Gemini backend error:', errorMsg);
      return {
        success: false,
        text: '',
        error: errorMsg,
      };
    }
  }

  /**
   * Analyze arbitrage opportunity using LLM reasoning
   */
  async analyzeArbitrage(context: {
    route: any;
    marketData: any;
    riskParams: any;
  }): Promise<{
    recommendation: 'PROCEED' | 'ABORT' | 'ADJUST';
    reasoning: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    adjustments?: Record<string, any>;
  }> {
    const prompt = `You are an expert DeFi arbitrage analyst. Analyze the following arbitrage opportunity and provide a recommendation.

Route Information:
${JSON.stringify(context.route, null, 2)}

Market Data:
${JSON.stringify(context.marketData, null, 2)}

Risk Parameters:
${JSON.stringify(context.riskParams, null, 2)}

Analyze this opportunity considering:
1. Route efficiency (number of hops, DEX reputation)
2. Market conditions (volatility, liquidity depth)
3. Risk factors (slippage, price impact, MEV)
4. Profit potential vs. gas costs

Provide your response in the following JSON format:
{
  "recommendation": "PROCEED | ABORT | ADJUST",
  "reasoning": "Detailed explanation of your analysis",
  "confidence": "HIGH | MEDIUM | LOW",
  "adjustments": {
    // Optional: Suggested parameter adjustments if recommendation is ADJUST
  }
}`;

    const response = await this.generateCompletion({
      prompt,
      systemPrompt:
        'You are a professional DeFi analyst with expertise in arbitrage strategies on Solana. Provide precise, actionable recommendations based on data.',
      temperature: 0.3, // Lower temperature for more deterministic output
    });

    if (!response.success || !response.text) {
      return {
        recommendation: 'ABORT',
        reasoning: `LLM analysis failed: ${response.error || 'No response'}`,
        confidence: 'LOW',
      };
    }

    try {
      // Try to parse JSON response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          recommendation: parsed.recommendation || 'ABORT',
          reasoning: parsed.reasoning || response.text,
          confidence: parsed.confidence || 'LOW',
          adjustments: parsed.adjustments,
        };
      }

      // If no JSON, return text-based analysis
      return {
        recommendation: 'ABORT',
        reasoning: response.text,
        confidence: 'LOW',
      };
    } catch (error) {
      console.error('❌ Failed to parse LLM response:', error);
      return {
        recommendation: 'ABORT',
        reasoning: `Failed to parse LLM response: ${response.text}`,
        confidence: 'LOW',
      };
    }
  }

  /**
   * Health check for Gemini backend
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await this.generateCompletion({
        prompt: 'Health check',
        maxTokens: 10,
      });

      return {
        healthy: response.success,
        error: response.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        healthy: false,
        error: errorMsg,
      };
    }
  }
}
