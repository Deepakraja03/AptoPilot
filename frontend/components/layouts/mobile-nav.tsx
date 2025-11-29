"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/ui/logo";
import WalletConnect from "../ui/WalletConnect";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "📊",
  },
  {
    title: "Intent",
    href: "/intent",
    icon: "🎯",
  },
  {
    title: "Swap",
    href: "/swap",
    icon: "🔄",
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: "📈",
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="md:hidden" size="icon">
          <HamburgerIcon className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col pr-0">
        <Logo onClick={handleLinkClick} className="px-4 mb-8" />
        <nav className="grid gap-2 px-2">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-lg font-medium rounded-lg hover:bg-accent transition-colors",
                pathname === item.href ? "bg-accent" : "transparent"
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span>{item.title}</span>
              {pathname === item.href && (
                <span className="ml-auto w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-600 via-blue-500 to-cyan-400" />
              )}
            </Link>
          ))}
          <div className="flex pl-3 items-center gap-4">
            <WalletConnect />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}
