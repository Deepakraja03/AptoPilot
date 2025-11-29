"use client";

import React from "react";
import Link from "next/link";

export const QuestBanner: React.FC = () => {
  const bannerContent = (
    <div className="flex items-center space-x-3 min-w-max px-4">
      <div
        className="w-5 h-5 rounded flex items-center justify-center"
        style={{ backgroundColor: "#9B5FFF" }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 6L9 17L4 12"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <span className="text-white">
        <strong>QUEST IS LIVE!</strong> Join our Galxe quest and earn exclusive
        rewards
      </span>

      <Link
        href="https://app.galxe.com/quest/RijSAavNdyi4q2sMJ9EKkB/GCC8Kt6t5D"
        target="_blank"
        rel="noopener noreferrer"
        className="text-white cursor-pointer underline hover:text-blue-300 transition-colors font-semibold text-sm"
      >
        Participate in Galxe
      </Link>
    </div>
  );

  return (
    <div
      className="text-white py-3 px-4 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #1a0b3d 0%, #2d1b69 50%, #4c2882 100%)",
        border: "1px solid rgba(155, 95, 255, 0.3)",
      }}
    >
      <div className="relative w-full overflow-hidden">
        <div className="flex animate-marquee space-x-16">
          {bannerContent}
          {bannerContent}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-marquee {
          animation: marquee 20s linear infinite;
          width: max-content;
        }
      `}</style>
    </div>
  );
};
