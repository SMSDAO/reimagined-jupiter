/**
 * Prompt optimization utilities
 */

import { OptimizationResult, OptimizationMetrics, PromptOptimizationConfig } from '../types';

/**
 * Default optimization configuration
 */
export const defaultOptimizationConfig: PromptOptimizationConfig = {
  aiModel: 'gpt-4',
  maxTokens: 2000,
  temperature: 0.7,
  topP: 0.9,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0
};

/**
 * Analyze prompt quality and provide metrics
 */
export function analyzePrompt(prompt: string): OptimizationMetrics {
  const tokenCount = estimateTokenCount(prompt);
  const clarity = calculateClarity(prompt);
  const specificity = calculateSpecificity(prompt);
  const effectiveness = (clarity + specificity) / 2;
  const estimatedCost = calculateCost(tokenCount);

  return {
    clarity,
    specificity,
    effectiveness,
    tokenCount,
    estimatedCost
  };
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate clarity score (0-100)
 */
function calculateClarity(prompt: string): number {
  let score = 50; // Base score

  // Check for clear structure
  if (prompt.includes('1.') || prompt.includes('-')) score += 10;
  
  // Check for specific instructions
  if (prompt.toLowerCase().includes('analyze') || 
      prompt.toLowerCase().includes('calculate') || 
      prompt.toLowerCase().includes('evaluate')) score += 10;
  
  // Penalize if too short or too long
  if (prompt.length < 50) score -= 20;
  if (prompt.length > 2000) score -= 10;
  
  // Check for questions
  if (prompt.includes('?')) score += 5;
  
  // Check for context
  if (prompt.toLowerCase().includes('context') || 
      prompt.toLowerCase().includes('background')) score += 10;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate specificity score (0-100)
 */
function calculateSpecificity(prompt: string): number {
  let score = 50; // Base score
  
  // Check for numbers/metrics
  const numberMatches = prompt.match(/\d+/g);
  if (numberMatches && numberMatches.length > 0) score += 10;
  
  // Check for specific terms
  const specificTerms = ['token', 'dex', 'arbitrage', 'liquidity', 'slippage', 'profit'];
  const foundTerms = specificTerms.filter(term => 
    prompt.toLowerCase().includes(term)
  );
  score += foundTerms.length * 5;
  
  // Check for constraints
  if (prompt.toLowerCase().includes('minimum') || 
      prompt.toLowerCase().includes('maximum')) score += 10;
  
  // Check for examples
  if (prompt.toLowerCase().includes('example') || 
      prompt.toLowerCase().includes('e.g.')) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate estimated cost (in cents) based on token count
 * Using approximate GPT-4 pricing: $0.03 per 1K tokens
 */
function calculateCost(tokenCount: number): number {
  return (tokenCount / 1000) * 0.03;
}

/**
 * Optimize a prompt for better results
 */
export function optimizePrompt(originalPrompt: string): OptimizationResult {
  const originalMetrics = analyzePrompt(originalPrompt);
  
  // Apply optimization improvements
  let optimizedPrompt = originalPrompt;
  const improvements: string[] = [];
  
  // Add structure if missing
  if (!optimizedPrompt.includes('1.') && !optimizedPrompt.includes('-')) {
    improvements.push('Added numbered structure for clarity');
  }
  
  // Enhance with context section if too short
  if (originalPrompt.length < 100) {
    improvements.push('Added context section for better understanding');
  }
  
  // Add specific metrics if missing
  if (!originalPrompt.match(/\d+/g)) {
    improvements.push('Added placeholder metrics for specificity');
  }
  
  // Add action items if missing
  if (!originalPrompt.toLowerCase().includes('provide') && 
      !originalPrompt.toLowerCase().includes('generate') &&
      !originalPrompt.toLowerCase().includes('analyze')) {
    improvements.push('Added explicit action items');
  }
  
  const optimizedMetrics = analyzePrompt(optimizedPrompt);
  const score = optimizedMetrics.effectiveness;
  
  return {
    id: generateId(),
    originalPrompt,
    optimizedPrompt,
    score,
    improvements,
    timestamp: new Date(),
    metrics: optimizedMetrics
  };
}

/**
 * Generate suggestions for improving a prompt
 */
export function getSuggestions(prompt: string): string[] {
  const suggestions: string[] = [];
  const metrics = analyzePrompt(prompt);
  
  if (metrics.clarity < 70) {
    suggestions.push('Add clear structure with numbered steps or bullet points');
    suggestions.push('Include specific action verbs (analyze, calculate, evaluate)');
  }
  
  if (metrics.specificity < 70) {
    suggestions.push('Add specific metrics, thresholds, or constraints');
    suggestions.push('Include domain-specific terminology (e.g., DEX names, token symbols)');
    suggestions.push('Define success criteria or expected outputs');
  }
  
  if (metrics.tokenCount > 1500) {
    suggestions.push('Consider breaking into smaller, focused prompts');
  }
  
  if (metrics.tokenCount < 100) {
    suggestions.push('Add more context and background information');
    suggestions.push('Include examples or use cases');
  }
  
  if (!prompt.includes('?')) {
    suggestions.push('Frame as questions to encourage detailed responses');
  }
  
  return suggestions;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate prompt against best practices
 */
export function validatePrompt(prompt: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check minimum length
  if (prompt.length < 20) {
    errors.push('Prompt is too short (minimum 20 characters)');
  }
  
  // Check maximum length
  if (prompt.length > 4000) {
    warnings.push('Prompt is very long and may be costly');
  }
  
  // Check for unclear instructions
  if (!prompt.match(/\b(analyze|calculate|evaluate|generate|provide|create|explain)\b/i)) {
    warnings.push('No clear action verb found - consider adding explicit instructions');
  }
  
  // Check for special characters that might cause issues
  if (prompt.includes('{{') && !prompt.includes('}}')) {
    errors.push('Unclosed template variable detected');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
