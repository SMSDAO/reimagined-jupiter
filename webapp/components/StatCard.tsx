'use client';

import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  loading?: boolean;
}

export default function StatCard({ 
  label, 
  value, 
  icon, 
  trend, 
  trendValue,
  color = 'text-purple-400',
  loading = false
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 text-center border border-white/10 shadow-lg hover:shadow-2xl transition-shadow"
    >
      {icon && <div className="text-3xl sm:text-4xl mb-2">{icon}</div>}
      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-600 rounded w-24 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-32 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</div>
          <div className="text-sm sm:text-base text-gray-300 mt-1">{label}</div>
          {trend && trendValue && (
            <div className={`text-xs sm:text-sm mt-2 font-semibold ${
              trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '●'} {trendValue}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
