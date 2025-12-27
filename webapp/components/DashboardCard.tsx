"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  icon?: string;
  children: ReactNode;
  className?: string;
  gradient?: string;
}

export default function DashboardCard({
  title,
  icon,
  children,
  className = "",
  gradient = "from-purple-900/50 to-blue-900/50",
}: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${gradient} backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10 shadow-xl ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-2xl">{icon}</span>}
        <h3 className="text-lg sm:text-xl font-bold text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}
