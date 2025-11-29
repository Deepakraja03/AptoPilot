"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface SectionLoadingProps {
  title?: string;
  message?: string;
  className?: string;
}

export function SectionLoading({ 
  title = "Loading...", 
  message = "Fetching latest data",
  className = ""
}: SectionLoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="mb-4"
      >
        <Loader2 className="w-8 h-8 text-[#FA4C15]" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-400">{message}</p>
      </motion.div>
    </div>
  );
}

// Skeleton components for individual sections
export function PortfolioSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-700 rounded w-32 animate-pulse" />
        <div className="h-4 bg-gray-700 rounded w-4 animate-pulse" />
      </div>
      <div className="flex items-center justify-center h-64">
        <div className="w-48 h-48 bg-gray-700 rounded-full animate-pulse" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-700 rounded-full animate-pulse" />
              <div className="h-4 bg-gray-700 rounded w-20 animate-pulse" />
            </div>
            <div className="h-4 bg-gray-700 rounded w-16 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TransactionsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-700 rounded w-40 animate-pulse" />
        <div className="h-8 bg-gray-700 rounded w-20 animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg">
            <div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-700 rounded w-32 animate-pulse" />
                <div className="h-4 bg-gray-700 rounded w-20 animate-pulse" />
              </div>
              <div className="h-3 bg-gray-700 rounded w-48 animate-pulse" />
            </div>
            <div className="h-6 bg-gray-700 rounded w-16 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TokensSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-700 rounded w-48 animate-pulse" />
        <div className="h-8 bg-gray-700 rounded w-24 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 bg-gray-800/30 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-700 rounded w-20 animate-pulse" />
                <div className="h-3 bg-gray-700 rounded w-16 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              {[1, 2].map((j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="h-3 bg-gray-700 rounded w-12 animate-pulse" />
                  <div className="h-3 bg-gray-700 rounded w-16 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}