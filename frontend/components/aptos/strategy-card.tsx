/**
 * Aptos Strategy Card Component
 * Displays strategy information and management actions
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play, X, ExternalLink } from "lucide-react";
import { Strategy } from "@/lib/aptos/contract-interface";
import { getExplorerUrl } from "@/lib/aptos/wallet";

interface StrategyCardProps {
    strategy: Strategy & {
        params?: any;
        strategyTypeName?: string;
        statusName?: string;
    };
    onPause?: (id: number) => void;
    onResume?: (id: number) => void;
    onCancel?: (id: number) => void;
    isLoading?: boolean;
}

export function AptosStrategyCard({
    strategy,
    onPause,
    onResume,
    onCancel,
    isLoading,
}: StrategyCardProps) {
    const isActive = strategy.status === 1;
    const isPaused = strategy.status === 2;
    const isCompleted = strategy.status === 3;
    const isCancelled = strategy.status === 4;

    const getStatusColor = () => {
        if (isActive) return "bg-green-500";
        if (isPaused) return "bg-yellow-500";
        if (isCompleted) return "bg-blue-500";
        if (isCancelled) return "bg-red-500";
        return "bg-gray-500";
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString();
    };

    const formatInterval = (seconds: number) => {
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    };

    return (
        <Card className="border-gray-800 bg-gray-900/30">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                        {strategy.strategyTypeName || `Strategy #${strategy.id}`}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                        {strategy.statusName || "Unknown"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Strategy Parameters */}
                {strategy.params && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-400">Parameters</h4>
                        <div className="text-sm space-y-1">
                            {Object.entries(strategy.params).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                    <span className="text-gray-400 capitalize">
                                        {key.replace(/([A-Z])/g, " $1").trim()}:
                                    </span>
                                    <span className="font-mono">
                                        {typeof value === "object"
                                            ? JSON.stringify(value)
                                            : String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Execution Info */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-400">Execution</h4>
                    <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Interval:</span>
                            <span className="font-mono">
                                {formatInterval(strategy.intervalSeconds)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Executions:</span>
                            <span className="font-mono">
                                {strategy.executionCount}
                                {strategy.maxExecutions > 0 && ` / ${strategy.maxExecutions}`}
                            </span>
                        </div>
                        {strategy.lastExecuted > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-400">Last Executed:</span>
                                <span className="font-mono text-xs">
                                    {formatDate(strategy.lastExecuted)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-400">Created:</span>
                            <span className="font-mono text-xs">
                                {formatDate(strategy.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {isActive && onPause && (
                        <Button
                            onClick={() => onPause(strategy.id)}
                            disabled={isLoading}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                        >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                        </Button>
                    )}
                    {isPaused && onResume && (
                        <Button
                            onClick={() => onResume(strategy.id)}
                            disabled={isLoading}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                        </Button>
                    )}
                    {(isActive || isPaused) && onCancel && (
                        <Button
                            onClick={() => onCancel(strategy.id)}
                            disabled={isLoading}
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                    )}
                    <Button
                        onClick={() =>
                            window.open(
                                `https://explorer.aptoslabs.com/account/${strategy.owner}?network=testnet`,
                                "_blank"
                            )
                        }
                        variant="ghost"
                        size="sm"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
