"use client";

import { useState } from "react";
import PromptEditor from "./components/PromptEditor";
import TemplateLibrary from "./components/TemplateLibrary";
import StrategyDashboard from "./components/StrategyDashboard";
import { PromptTemplate } from "./types";

type Tab = "dashboard" | "editor" | "templates" | "strategies";

export default function PromptOptimizerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [currentPrompt, setCurrentPrompt] = useState<string>("");

  const handleTemplateSelect = (template: PromptTemplate) => {
    setCurrentPrompt(template.template);
    setActiveTab("editor");
  };

  const handleSavePrompt = (prompt: string) => {
    setCurrentPrompt(prompt);
    // In a real app, you'd save this to a database or state management
    console.log("Prompt saved:", prompt);
  };

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: "📊" },
    { id: "editor" as Tab, label: "Prompt Editor", icon: "✏️" },
    { id: "templates" as Tab, label: "Templates", icon: "📚" },
    { id: "strategies" as Tab, label: "Strategies", icon: "🎯" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            PromptOptimizer
          </h1>
          <p className="text-gray-400 text-lg">
            AI-Powered Prompt Engineering for Solana DeFi Arbitrage
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-800 rounded-lg p-2 mb-8 shadow-lg border border-purple-500/20">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-purple-500/20">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Welcome to PromptOptimizer
                </h2>
                <p className="text-gray-300 mb-6">
                  PromptOptimizer combines AI prompt engineering with Solana
                  DeFi arbitrage strategies. Use our tools to create, optimize,
                  and test prompts for maximum profitability.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 rounded-lg">
                    <div className="text-4xl mb-3">✏️</div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Prompt Editor
                    </h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Create and analyze prompts with real-time metrics and
                      suggestions.
                    </p>
                    <button
                      onClick={() => setActiveTab("editor")}
                      className="px-4 py-2 bg-white text-purple-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Start Editing
                    </button>
                  </div>

                  <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-6 rounded-lg">
                    <div className="text-4xl mb-3">📚</div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Template Library
                    </h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Browse pre-built templates for arbitrage, DeFi, and
                      trading analysis.
                    </p>
                    <button
                      onClick={() => setActiveTab("templates")}
                      className="px-4 py-2 bg-white text-blue-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Browse Templates
                    </button>
                  </div>

                  <div className="bg-gradient-to-br from-green-900 to-green-800 p-6 rounded-lg">
                    <div className="text-4xl mb-3">🎯</div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Strategy Optimizer
                    </h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Optimize DeFi arbitrage strategies with AI-powered
                      recommendations.
                    </p>
                    <button
                      onClick={() => setActiveTab("strategies")}
                      className="px-4 py-2 bg-white text-green-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      View Strategies
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-purple-500/20">
                  <h3 className="text-xl font-bold text-white mb-3">
                    Key Features
                  </h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span>Real-time prompt analysis and optimization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span>Pre-built templates for DeFi operations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span>Arbitrage strategy recommendations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span>Integration with Solana DeFi protocols</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span>Cost estimation and ROI calculation</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-purple-500/20">
                  <h3 className="text-xl font-bold text-white mb-3">
                    Quick Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Available Templates</span>
                      <span className="text-2xl font-bold text-purple-400">
                        4
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Active Strategies</span>
                      <span className="text-2xl font-bold text-blue-400">
                        4
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Supported DEXs</span>
                      <span className="text-2xl font-bold text-green-400">
                        11+
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">
                        Flash Loan Providers
                      </span>
                      <span className="text-2xl font-bold text-yellow-400">
                        5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "editor" && (
            <PromptEditor
              initialPrompt={currentPrompt}
              onSave={handleSavePrompt}
            />
          )}

          {activeTab === "templates" && (
            <TemplateLibrary onSelectTemplate={handleTemplateSelect} />
          )}

          {activeTab === "strategies" && <StrategyDashboard />}
        </div>
      </div>
    </div>
  );
}
