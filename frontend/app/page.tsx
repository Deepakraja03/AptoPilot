"use client";

import Link from "next/link";
import TypewriterEffect from "@/components/animations/TypewriterEffect";
import Image from "next/image";
import codeSpace from "@/app/assets/codeImage.svg";
import Capability1 from "@/app/assets/capabilities1.svg";
import Optimization from "@/app/assets/optimization.svg";
import GlitchText from "@/components/animations/glitch";

export default function Home() {
  return (
    <div>
      <div className="flex flex-col min-h-screen bg-[#0e0e0e]">
        <section className="px-4 py-10 md:py-5 bg-[#0e0e0e] text-white">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center">
              {/* Left column - Text content */}
              <div className="w-full md:w-7/12 lg:w-7/12">
                <h1 className="text-7xl md:text-8xl font-light tracking-tight">
                  <span className="hover:cursor-pointer">
                    Turn simple words
                  </span>
                  <br />
                  <span className="hover:cursor-pointer">into</span>
                  <span
                    style={{ fontFamily: "InstrumentSerif" }}
                    className="text-[#FA4C15] italic"
                  >
                    <TypewriterEffect className="leading-[1.2]" />
                  </span>
                </h1>

                <p className="text-xl text-gray-400 mt-8 mb-5 max-w-2xl">
                  AptoPilot is the first AI-powered intent engine for DeFi that
                  turns natural language into automated, gasless, cross-chain
                  strategies.
                </p>

                <div className="flex space-x-6">
                  <button
                    disabled
                    className="bg-[#FA4C15] cursor-not-allowed text-white px-10 py-4 rounded text-lg opacity-90"
                  >
                    Coming Soon...
                  </button>
                  <Link
                    href="/faucet"
                    className="border border-white hover:cursor-pointer text-white px-10 py-4 rounded hover:bg-gray-900 text-lg inline-block text-center"
                  >
                    Faucet
                  </Link>
                </div>

                <p className="text-gray-500 mt-5 text-lg">
                  No gas. No code. No limits.
                </p>
              </div>

              {/* Middle - Vertical divider */}
              <div className="hidden md:block md:h-[678px] md:mx-4 lg:mx-6">
                <div className="h-full w-0.5 radial-gradient opacity-20"></div>
              </div>

              {/* Right column - Image */}
              <div className="w-full md:w-5/12 lg:w-5/12 mt-12 md:mt-0 overflow-hidden">
                {" "}
                {/* Ensure ml-auto pushes the image right */}
                <Image
                  src={codeSpace}
                  alt="Code Space"
                  width={1500}
                  height={1500}
                  className="h-auto object-contain md:object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <div className="bg-[url('/landing/frame.svg')] bg-contain bg-center bg-no-repeat text-white pt-16 py-10 px-4">
          <div className="container mx-auto flex flex-col md:flex-row items-start justify-between gap-4">
            {/* Intent Section */}
            <div className="flex flex-col flex-1">
              <h2
                className="text-3xl md:text-4xl font-serif text-orange-500 mb-6"
                style={{ fontFamily: "InstrumentSerif" }}
              >
                <GlitchText
                  text="Your intent"
                  className="text-orange-500 hover:cursor-pointer"
                />
              </h2>
              <div>
                <p className="text-white text-lg">
                  No wallet hopping. No spreadsheets. No guesswork. Just one
                  sentence.
                </p>
              </div>
              <div className="mb-6">
                <p className="text-gray-400 text-lg mb-0">
                  &quot;Move $1,000 into low-risk DeFi that adapts weekly.&quot;
                </p>
              </div>
            </div>

            {/* Plus Sign 1 */}
            <div className="flex items-center justify-center md:mr-3 md:mt-28 my-8 md:my-0 opacity-50">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5V19M5 12H19"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* AI Engine Section */}
            <div className="flex flex-col flex-1">
              <h2
                className="text-3xl md:text-4xl font-serif text-orange-500 mb-6"
                style={{ fontFamily: "InstrumentSerif" }}
              >
                <GlitchText
                  text="Our AI engine"
                  className="text-orange-500 hover:cursor-pointer"
                />
              </h2>
              <div>
                <p className="text-white text-lg">
                  No approvals. No gas anxiety. No breaking flows. It just
                  works.
                </p>
              </div>
              <div className="mb-6">
                <p className="text-gray-400 text-lg mb-0">
                  Executed via Circle CCTP, 1inch, and Zircuit — gas-free.
                </p>
              </div>
            </div>

            {/* Plus Sign 2 */}
            <div className="flex items-center justify-center md:mr-3 md:mt-28 my-8 md:my-0 opacity-50">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5V19M5 12H19"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Runs & Adapts Section */}
            <div className="flex flex-col flex-1">
              <h2
                className="text-3xl md:text-4xl font-serif text-orange-500 mb-6"
                style={{ fontFamily: "InstrumentSerif" }}
              >
                <GlitchText
                  text="It runs, adapts &amp; grows"
                  className="text-orange-500 hover:cursor-pointer"
                />
              </h2>
              <div>
                <p className="text-white text-lg">
                  You set the intent. We handle the rest — live, compliant, and
                  optimized.
                </p>
              </div>
              <div className="mb-6">
                <p className="text-gray-400 text-lg mb-0">
                  &quot;One goal becomes a full plan that grows and
                  adapts.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="bg-[#0e0e0e] text-white py-8 md:pt-20 px-4">
          <div className="container mx-auto">
            {/* Heading Section */}
            <div className="flex justify-center gap-4 items-center">
              <Image
                src="/landing/left.svg"
                alt="right"
                width={200}
                height={200}
              />
              <h2
                className=" md:text-lg font-bold px-4 py-2 rounded-full text-white bg-[#FA4C15]/60 mb-2"
                style={{ fontFamily: "Satoshi" }}
              >
                where DeFi gets superpowers
              </h2>
              <Image
                src="/landing/right.svg"
                alt="right"
                width={200}
                height={200}
              />
            </div>
            <div className="text-center mt-5 mb-12">
              <h2
                style={{ fontFamily: "Satoshi" }}
                className="text-4xl md:text-6xl font-extrabold mb-2 bg-gradient-to-r from-[#FA4C15] to-white bg-clip-text text-transparent"
              >
                Core Capabilities
              </h2>

              <div className="flex justify-center items-center">
                <h2
                  style={{ fontFamily: "Satoshi" }}
                  className="text-4xl md:text-6xl font-extrabold mb-2 bg-gradient-to-r from-[#FA4C15] to-white bg-clip-text text-transparent"
                >
                  That Set Us Apart
                </h2>
              </div>

              <p className="text-gray-400 mt-8 max-w-xl mx-auto text-lg text-center">
                AptoPilot goes beyond basic automation — enabling yielding,
                lending, borrowing, and real strategy execution through simple
                commands.
              </p>
            </div>

            {/* Two Column Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              {/* Left Column - Intent-to-Action */}
              <div className="rounded-2xl bg-[url('/landing/bg-card.svg')] bg-no-repeat bg-contain p-8">
                <Image
                  src={Capability1}
                  alt="Intent-to-Action"
                  width={400}
                  height={400}
                  className="mb-8 w-full"
                />
                {/* Intent Title */}
                <h3
                  className="text-2xl md:text-4xl font-bold text-orange-500 mb-4"
                  style={{ fontFamily: "Satoshi" }}
                >
                  <GlitchText
                    text="Intent-to-Action AI Engine"
                    className="text-orange-500 hover:cursor-pointer"
                  />
                </h3>

                <p className="text-gray-400 mb-4 text-lg">
                  Type your goal, and our AI builds a live, cross-chain DeFi
                  strategy instantly.{" "}
                </p>

                <p className="text-white text-lg">
                  No need for coding, forms, or step-by-step setups. Just type
                  it <br />— we’ll execute it.
                </p>
              </div>

              {/* Right Column - Built-in Yielding */}
              <div className="rounded-2xl bg-[url('/landing/bg-card2.svg')] bg-no-repeat bg-contain flex flex-col gap-3 justify-end p-8">
                {/* Intent Title */}
                <h3
                  className="text-2xl md:text-4xl font-bold text-orange-500 mb-4"
                  style={{ fontFamily: "Satoshi" }}
                >
                  <GlitchText
                    text="Built-in Yielding and Lending"
                    className="text-orange-500 hover:cursor-pointer"
                  />
                </h3>

                <p className="text-gray-400 mb-4 text-lg">
                  Go beyond simple swaps — build real financial strategies with
                  intent.
                </p>

                <p className="text-white text-lg">
                  You can lend, borrow, and farm yields across protocols using a
                  single command.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0e0e0e] text-white px-8 mt-0">
          <div className="container mx-auto">
            <div className="rounded-2xl bg-[url('/landing/bg-card3.svg')] bg-no-repeat bg-contain flex flex-col gap-3 justify-end p-8">
              <div className="flex flex-col md:flex-row items-end justify-between mt-8 md:mt-8 md:py-10 ">
                {/* Text on the left bottom */}
                <div className="max-w-2xl pt-40">
                  <div
                    className="text-2xl md:text-4xl font-bold text-orange-500 mb-4"
                    style={{ fontFamily: "Satoshi" }}
                  >
                    <GlitchText
                      text="Gasless, Compliant, and Cross-Chain"
                      className="text-orange-500 hover:cursor-pointer"
                    />
                  </div>
                  <div className="text-gray-400 mb-4 text-lg">
                    Execute strategies across multiple blockchains without
                    paying gas fees or <br /> switching wallets.{" "}
                  </div>
                  <div className="text-white text-lg">
                    Operate across the DeFi ecosystem with zero gas fees and
                    full compliance from <br /> day one.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optimization Section */}
        <div className="bg-[#0e0e0e] text-white py-0 px-4">
          <div className="container mx-auto">
            {/* Two Column Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              {/* Left Column - Always-On Optimization */}
              <div className="rounded-2xl bg-[url('/landing/bg-card.svg')] bg-no-repeat bg-contain flex flex-col  justify-end p-8">
                <Image
                  src={Optimization}
                  alt="Optimization"
                  width={400}
                  height={400}
                  className="mb-8 w-full object-contain"
                />
                <h3
                  className="text-2xl md:text-4xl font-bold text-orange-500 mb-4"
                  style={{ fontFamily: "Satoshi" }}
                >
                  <GlitchText
                    text="Always-On Optimization"
                    className="text-orange-500 hover:cursor-pointer"
                  />
                </h3>

                <p className="text-gray-400 mb-2 text-lg">
                  Your deployed strategies stay smart and in sync with the
                  market.
                </p>

                <p className="text-white text-lg">
                  AptoPilot constantly checks for better APYs, risk scores, and
                  gas routes — and updates automatically.
                </p>
              </div>

              {/* Right Column - One-Time KYC */}
              <div className="rounded-2xl bg-[url('/landing/bg-card4.svg')] bg-no-repeat bg-contain flex flex-col justify-end p-8">
                <h3
                  className="text-2xl md:text-4xl font-bold text-orange-500 mb-4"
                  style={{ fontFamily: "Satoshi" }}
                >
                  <GlitchText
                    text="Autonomous News Intelligence"
                    className="text-orange-500 hover:cursor-pointer"
                  />
                </h3>

                <p className="text-gray-400 mb-2 text-lg">
                  Get real-time, bias-mitigated news powered by autonomous AI
                  agents — always on, always accurate.
                </p>

                <p className="text-white text-lg">
                  From breaking market alerts to deep dives, we deliver
                  verifiable updates 24/7 in multiple formats.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-800 mt-5"></div>
        {/* Footer */}

        <footer className="mb-10 rounded-b-2xl bg-[#0e0e0e]">
          <div className="border-b-2 border-gray-800 border-dotted mt-12"></div>
          <div className="flex flex-col text-white md:flex-row justify-center items-center my-4 space-y-4 md:space-x-8 md:space-y-0">
            <div className="hover:cursor-pointer">Privacy Policy</div>
            <div className="hover:cursor-pointer">Terms of Service</div>
            <div className="hover:cursor-pointer">Risk Disclaimer</div>
            <div className="hover:cursor-pointer">
              ©2025 AptoPilot™ // ALL RIGHTS RESERVED
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
