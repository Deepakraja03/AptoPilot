"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
  },
  {
    title: "Intent",
    href: "/intent",
  },
  {
    title: "Swap",
    href: "/swap",
  },

  // {
  //   title: "Identity",
  //   href: "/verify",
  // },
  {
    title: "Analytics",
    href: "/analytics",
  },
];

interface MainNavProps {
  className?: string;
}

export function MainNav({ className }: MainNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex items-center space-x-6">
      <nav className={cn("hidden md:flex items-center space-x-6", className)}>
        {mainNavItems.map((item) => {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative group flex items-center text-sm font-medium transition-colors hover:text-yellow-500",
                pathname === item.href ? "text-yellow-500" : "text-white"
              )}
            >
              {item.title}
              {pathname === item.href && (
                <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-white transform" />
              )}
              <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
