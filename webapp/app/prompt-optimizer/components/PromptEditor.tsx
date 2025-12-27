"use client";

import { useState } from "react";
import {
  analyzePrompt,
  getSuggestions,
  validatePrompt,
} from "../lib/optimizer";
import { OptimizationMetrics } from "../types";

interface PromptEditorProps {
  initialPrompt?: string;
  onSave?: (prompt: string) => void;
}

export default function PromptEditor({
  initialPrompt = "",
  onSave,
}: PromptEditorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const handleAnalyze = () => {
    const newMetrics = analyzePrompt(prompt);
    const newSuggestions = getSuggestions(prompt);
    const newValidation = validatePrompt(prompt);

    setMetrics(newMetrics);
    setSuggestions(newSuggestions);
    setValidation(newValidation);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(prompt);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-purple-500/20">
        <h2 className="text-2xl font-bold text-white mb-4">Prompt Editor</h2>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-64 bg-gray-900 text-white p-4 rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none resize-none font-mono text-sm"
          placeholder="Enter your prompt here..."
        />

        <div className="flex gap-4 mt-4">
          <button
            onClick={handleAnalyze}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            Analyze
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setPrompt("")}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {validation && !validation.valid && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h3 className="text-red-400 font-bold mb-2">Validation Errors</h3>
          <ul className="list-disc list-inside text-red-300 space-y-1">
            {validation.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {validation && validation.warnings.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
          <h3 className="text-yellow-400 font-bold mb-2">Warnings</h3>
          <ul className="list-disc list-inside text-yellow-300 space-y-1">
            {validation.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {metrics && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-purple-500/20">
          <h3 className="text-xl font-bold text-white mb-4">Prompt Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Clarity</div>
              <div
                className={`text-2xl font-bold ${getScoreColor(metrics.clarity)}`}
              >
                {metrics.clarity.toFixed(0)}%
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Specificity</div>
              <div
                className={`text-2xl font-bold ${getScoreColor(metrics.specificity)}`}
              >
                {metrics.specificity.toFixed(0)}%
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Effectiveness</div>
              <div
                className={`text-2xl font-bold ${getScoreColor(metrics.effectiveness)}`}
              >
                {metrics.effectiveness.toFixed(0)}%
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Token Count</div>
              <div className="text-2xl font-bold text-blue-400">
                {metrics.tokenCount}
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Est. Cost</div>
              <div className="text-2xl font-bold text-green-400">
                ${metrics.estimatedCost.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-purple-500/20">
          <h3 className="text-xl font-bold text-white mb-4">
            Suggestions for Improvement
          </h3>
          <ul className="space-y-2">
            {suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-purple-400 mt-1">💡</span>
                <span className="text-gray-300">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
