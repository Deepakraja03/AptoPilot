"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Wallet,
    TrendingUp,
    Zap,
    Globe,
    Shield,
    Sparkles,
    Rocket,
    Gem,
    Target,
    Brain,
    Coffee,
    Moon,
    Bitcoin,
    DollarSign,
    Activity
} from "lucide-react";
import { useLoadingMessages } from "@/lib/hooks/use-loading-messages";

// Skeleton component for individual cards
const SkeletonCard = ({ className = "", children }: { className?: string; children?: React.ReactNode }) => (
    <div className={`bg-gray-900/50 border border-gray-800 rounded-xl p-6 ${className}`}>
        {children}
    </div>
);

// Skeleton line component
const SkeletonLine = ({ width = "100%", height = "h-4" }: { width?: string; height?: string }) => (
    <div
        className={`bg-gray-700 rounded animate-pulse ${height}`}
        style={{ width }}
    />
);

// Skeleton circle component
const SkeletonCircle = ({ size = "w-12 h-12" }: { size?: string }) => (
    <div className={`bg-gray-700 rounded-full animate-pulse ${size}`} />
);

// Main dashboard loading component
export function DashboardLoading() {
    const { currentMessage, messageIndex } = useLoadingMessages("dashboard", 5000);

    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white relative overflow-hidden">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                             linear-gradient(rgba(250, 76, 21, 0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(250, 76, 21, 0.1) 1px, transparent 1px)
                         `,
              backgroundSize: "50px 50px",
            }}
          />
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ["0px 0px", "50px 50px"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              backgroundImage: `
                            linear-gradient(rgba(255, 107, 53, 0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255, 107, 53, 0.05) 1px, transparent 1px)
                        `,
              backgroundSize: "100px 100px",
            }}
          />
        </div>
        {/* Header Skeleton */}
        <div className="px-4 py-6">
          <div className="container mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-2">
                <SkeletonLine width="300px" height="h-8" />
                <SkeletonLine width="200px" height="h-4" />
              </div>
              <SkeletonLine width="120px" height="h-10" />
            </div>
          </div>
        </div>

        {/* Loading Message with Animation */}
        <div className="px-4 py-8">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <div className="relative inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-[#ADFEB9] to-[#FF6B35] rounded-full mb-4">
                  {/* Rotating outer ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0 border-4 border-transparent border-t-white/30 border-r-white/20 rounded-full"
                  />

                  {/* Counter-rotating inner ring */}
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-2 border-2 border-transparent border-b-white/40 border-l-white/30 rounded-full"
                  />

                  {/* Central icon with pulse */}
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Sparkles className="w-10 h-10 text-white" />
                  </motion.div>

                  {/* Floating crypto icons */}
                  {[Bitcoin, DollarSign, Gem, Rocket].map((Icon, index) => (
                    <motion.div
                      key={index}
                      className="absolute w-6 h-6 text-white/60"
                      animate={{
                        rotate: 360,
                        x: [0, Math.cos((index * Math.PI) / 2) * 40, 0],
                        y: [0, Math.sin((index * Math.PI) / 2) * 40, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        delay: index * 0.5,
                        ease: "easeInOut",
                      }}
                      style={{
                        left: "50%",
                        top: "50%",
                        marginLeft: "-12px",
                        marginTop: "-12px",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={messageIndex}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{
                    duration: 0.6,
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                  }}
                  className="space-y-3"
                >
                  <motion.h2
                    className="text-2xl md:text-3xl font-bold text-white leading-tight"
                    animate={{
                      textShadow: [
                        "0 0 0px rgba(250, 76, 21, 0)",
                        "0 0 20px rgba(250, 76, 21, 0.3)",
                        "0 0 0px rgba(250, 76, 21, 0)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {currentMessage}
                  </motion.h2>
                  <motion.p
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    Preparing your personalized crypto universe ✨
                  </motion.p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dashboard Skeleton */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8 relative">
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#ADFEB9]/5 to-[#FF6B35]/5 blur-xl" />
              <div className="relative z-10">
                {/* Tabs Skeleton */}
                <div className="flex justify-center mb-8">
                  <div className="flex gap-2 bg-gray-800/50 p-1 rounded-xl">
                    <SkeletonLine width="80px" height="h-10" />
                    <SkeletonLine width="80px" height="h-10" />
                    <SkeletonLine width="100px" height="h-10" />
                  </div>
                </div>

                {/* Dashboard Metrics Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i}>
                      <div className="flex items-center gap-3 mb-2">
                        <SkeletonCircle size="w-8 h-8" />
                        <SkeletonLine width="60%" height="h-4" />
                      </div>
                      <SkeletonLine width="80%" height="h-6" />
                      <div className="mt-2">
                        <SkeletonLine width="40%" height="h-3" />
                      </div>
                    </SkeletonCard>
                  ))}
                </div>

                {/* Main Content Grid Skeleton */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-8">
                  {/* Portfolio Overview Skeleton */}
                  <SkeletonCard className="col-span-4">
                    <div className="flex items-center justify-between mb-4">
                      <SkeletonLine width="150px" height="h-6" />
                      <SkeletonCircle size="w-6 h-6" />
                    </div>
                    <div className="flex items-center justify-center h-64 mb-4">
                      <SkeletonCircle size="w-48 h-48" />
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <SkeletonCircle size="w-4 h-4" />
                            <SkeletonLine width="80px" height="h-4" />
                          </div>
                          <SkeletonLine width="60px" height="h-4" />
                        </div>
                      ))}
                    </div>
                  </SkeletonCard>

                  {/* Cross-Chain Opportunities Skeleton */}
                  <SkeletonCard className="col-span-3">
                    <div className="flex items-center justify-between mb-4">
                      <SkeletonLine width="180px" height="h-6" />
                      <SkeletonCircle size="w-6 h-6" />
                    </div>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 bg-gray-800/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <SkeletonLine width="120px" height="h-4" />
                            <SkeletonLine width="40px" height="h-4" />
                          </div>
                          <SkeletonLine width="100%" height="h-3" />
                          <div className="flex items-center justify-between mt-2">
                            <SkeletonLine width="60px" height="h-3" />
                            <SkeletonLine width="80px" height="h-3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </SkeletonCard>
                </div>

                {/* Tokens & Chains Skeleton */}
                <SkeletonCard className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <SkeletonLine width="200px" height="h-6" />
                    <SkeletonLine width="100px" height="h-8" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="p-4 bg-gray-800/30 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <SkeletonCircle size="w-8 h-8" />
                          <div className="flex-1">
                            <SkeletonLine width="80%" height="h-4" />
                            <div className="mt-1">
                              <SkeletonLine width="60%" height="h-3" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {[1, 2].map((j) => (
                            <div
                              key={j}
                              className="flex items-center justify-between"
                            >
                              <SkeletonLine width="50px" height="h-3" />
                              <SkeletonLine width="70px" height="h-3" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </SkeletonCard>

                {/* Recent Transactions Skeleton */}
                <SkeletonCard>
                  <div className="flex items-center justify-between mb-6">
                    <SkeletonLine width="180px" height="h-6" />
                    <SkeletonLine width="80px" height="h-8" />
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg"
                      >
                        <SkeletonCircle size="w-10 h-10" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <SkeletonLine width="150px" height="h-4" />
                            <SkeletonLine width="80px" height="h-4" />
                          </div>
                          <SkeletonLine width="200px" height="h-3" />
                        </div>
                        <SkeletonLine width="60px" height="h-6" />
                      </div>
                    ))}
                  </div>
                </SkeletonCard>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Fun Loading Icons */}
        <div className="fixed bottom-8 right-8">
          <div className="flex flex-col gap-3">
            {/* Main crypto icons */}
            <div className="flex gap-2">
              {[Wallet, TrendingUp, Zap, Globe, Shield, Bitcoin, Activity].map(
                (Icon, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0, opacity: 0, y: 20 }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: 1,
                      y: 0,
                      rotate: [0, 360, 0],
                    }}
                    transition={{
                      delay: index * 0.15,
                      duration: 0.8,
                      repeat: Infinity,
                      repeatType: "reverse",
                      repeatDelay: 3,
                      ease: "easeInOut",
                    }}
                    className="w-10 h-10 bg-gradient-to-r from-[#ADFEB9] to-[#FF6B35] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </motion.div>
                )
              )}
            </div>

            {/* Floating meme icons */}
            <div className="flex gap-2 justify-center">
              {[Rocket, Moon, Gem, Target, Coffee].map((Icon, index) => (
                <motion.div
                  key={`meme-${index}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: [0.6, 1, 0.6],
                    y: [0, -10, 0],
                  }}
                  transition={{
                    delay: index * 0.3 + 1,
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center opacity-80"
                >
                  <Icon className="w-4 h-4 text-white" />
                </motion.div>
              ))}
            </div>

            {/* Pulsing brain icon for "few understand" */}
            <motion.div
              className="flex justify-center"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <Brain className="w-3 h-3 text-white" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Floating crypto symbols */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {["₿", "Ξ", "◊", "⟠", "◈"].map((symbol, index) => (
            <motion.div
              key={symbol}
              className="absolute text-2xl font-bold text-white/10"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 50,
                rotate: 0,
              }}
              animate={{
                y: -50,
                rotate: 360,
                x: Math.random() * (window.innerWidth - 100),
              }}
              transition={{
                duration: Math.random() * 10 + 15,
                repeat: Infinity,
                delay: index * 2,
                ease: "linear",
              }}
            >
              {symbol}
            </motion.div>
          ))}
        </div>
      </div>
    );
}