/**
 * Custom React hook for prompt optimization
 */

import { useState, useCallback } from "react";
import {
  optimizePrompt,
  analyzePrompt,
  getSuggestions,
} from "../lib/optimizer";
import { OptimizationResult, OptimizationMetrics } from "../types";

export function usePromptOptimizer() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastResult, setLastResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optimize = useCallback(
    async (prompt: string): Promise<OptimizationResult> => {
      setIsOptimizing(true);
      setError(null);

      try {
        // Simulate async operation (in real app, this might call an API)
        await new Promise((resolve) => setTimeout(resolve, 500));

        const result = optimizePrompt(prompt);
        setLastResult(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        throw err;
      } finally {
        setIsOptimizing(false);
      }
    },
    [],
  );

  const analyze = useCallback((prompt: string): OptimizationMetrics => {
    return analyzePrompt(prompt);
  }, []);

  const suggest = useCallback((prompt: string): string[] => {
    return getSuggestions(prompt);
  }, []);

  return {
    optimize,
    analyze,
    suggest,
    isOptimizing,
    lastResult,
    error,
  };
}
