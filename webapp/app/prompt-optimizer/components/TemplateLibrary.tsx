'use client';

import { useState } from 'react';
import { PromptTemplate } from '../types';
import { defaultPromptTemplates, fillTemplate } from '../lib/promptTemplates';

interface TemplateLibraryProps {
  onSelectTemplate?: (template: PromptTemplate) => void;
}

export default function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  const categories = ['all', 'arbitrage', 'defi', 'trading', 'analysis', 'general'];

  const filteredTemplates = selectedCategory === 'all'
    ? defaultPromptTemplates
    : defaultPromptTemplates.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    // Initialize variables with default values
    const initialVars: Record<string, string> = {};
    template.variables.forEach(v => {
      if (v.defaultValue !== undefined) {
        initialVars[v.name] = String(v.defaultValue);
      }
    });
    setVariables(initialVars);
  };

  const handleVariableChange = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  };

  const handleUseTemplate = () => {
    if (selectedTemplate && onSelectTemplate) {
      onSelectTemplate(selectedTemplate);
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      all: 'bg-gray-600',
      arbitrage: 'bg-purple-600',
      defi: 'bg-blue-600',
      trading: 'bg-green-600',
      analysis: 'bg-yellow-600',
      general: 'bg-gray-500'
    };
    return colors[category] || 'bg-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-purple-500/20">
        <h2 className="text-2xl font-bold text-white mb-4">Template Library</h2>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedCategory === category
                  ? `${getCategoryColor(category)} text-white`
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className={`bg-gray-900 p-4 rounded-lg cursor-pointer transition-all border-2 ${
                selectedTemplate?.id === template.id
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'border-transparent hover:border-purple-500/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{template.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${getCategoryColor(template.category)}`}>
                  {template.category}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-3">{template.description}</p>
              <div className="flex flex-wrap gap-1">
                {template.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedTemplate && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-purple-500/20">
          <h3 className="text-xl font-bold text-white mb-4">Template Details</h3>
          
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-2">Variables</h4>
            <div className="space-y-3">
              {selectedTemplate.variables.map(variable => (
                <div key={variable.name}>
                  <label className="block text-gray-300 text-sm mb-1">
                    {variable.name}
                    {variable.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input
                    type={variable.type === 'number' ? 'number' : 'text'}
                    value={variables[variable.name] || ''}
                    onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                    placeholder={variable.description}
                    className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
                  />
                  <p className="text-gray-500 text-xs mt-1">{variable.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-white mb-2">Preview</h4>
            <div className="bg-gray-900 p-4 rounded-lg border border-purple-500/30 max-h-96 overflow-y-auto">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                {fillTemplate(selectedTemplate.template, variables)}
              </pre>
            </div>
          </div>

          <button
            onClick={handleUseTemplate}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            Use This Template
          </button>
        </div>
      )}
    </div>
  );
}
