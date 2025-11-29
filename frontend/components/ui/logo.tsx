import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import LogoImage from "@/public/logo.svg";
import Image from "next/image";

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export function Logo({ className, onClick }: LogoProps) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center">
      <Image
        src={LogoImage}
        alt="AptoPilot Logo"
        width={40}
        height={40}
        className="mr-2"
      />
      <div
        className={cn(
          "text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent",
          className
        )}
      >
        <span className="mr-2 italic text-white">AptoPilot</span>
        <span className="text-sm font-normal opacity-80">
          Cross-Chain Intent Finance
        </span>
      </div>
    </Link>
  );
}
