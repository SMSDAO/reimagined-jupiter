'use client';

import { motion } from 'framer-motion';

interface InstructionStep {
  icon: string;
  title: string;
  description: string;
}

interface InstructionPanelProps {
  title?: string;
  steps: InstructionStep[];
  additionalInfo?: React.ReactNode;
}

export default function InstructionPanel({
  title = '📋 How It Works',
  steps,
  additionalInfo,
}: InstructionPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10"
    >
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">{title}</h2>
      
      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{step.icon}</span>
                  <h3 className="text-lg font-bold text-white">{step.title}</h3>
                </div>
                <p className="text-sm text-gray-300">{step.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {additionalInfo && (
        <div className="mt-6 pt-6 border-t border-white/10">
          {additionalInfo}
        </div>
      )}
    </motion.div>
  );
}
