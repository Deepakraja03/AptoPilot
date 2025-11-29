"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HiOutlineMail, HiOutlineUser } from "react-icons/hi";
import { BiCheck } from "react-icons/bi";
import Image from "next/image";
import { BASE_URL } from "@/lib/constant";
import GlitchText from "@/components/animations/glitch";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    publicKey: process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY || "",
    apiKeyName: process.env.NEXT_PUBLIC_TURNKEY_API_KEY_NAME || "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/turnkey/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-[#FA4C15]/10 rounded-full flex items-center justify-center border border-[#FA4C15]/20">
                <BiCheck className="h-12 w-12 text-[#FA4C15]" />
              </div>
            </div>
            <h1 className="text-3xl font-light text-white mb-2">
              Registration{" "}
              <span
                style={{ fontFamily: "InstrumentSerif" }}
                className="text-[#FA4C15] italic"
              >
                Successful!
              </span>
            </h1>
            <p className="text-gray-400 text-base mb-8">
              Your account has been created successfully. Redirecting to
              login...
            </p>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#FA4C15] to-orange-500 h-3 rounded-full animate-pulse"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <Image
                src="/logo.svg"
                alt="IntentiFi Logo"
                width={80}
                height={80}
                className="w-20 h-20"
              />
              <div className="absolute -inset-3 bg-gradient-to-r from-[#ADFEB9]/20 to-white/20 rounded-full blur-xl"></div>
            </div>
          </div>
          <h1 className="text-5xl font-light tracking-tight text-white mb-2">
            Join{" "}
            <span
              style={{ fontFamily: "InstrumentSerif" }}
              className="text-[#ADFEB9] italic"
            >
              <GlitchText
                text="IntentiFi"
                className="text-[#ADFEB9] hover:cursor-pointer"
              />
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Start your DeFi journey with simple words
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          {error && (
            <div className="bg-red-950/50 border border-red-800/50 text-red-400 p-4 rounded-lg mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label
                htmlFor="username"
                className="text-white text-base font-medium block"
              >
                Username
              </label>
              <div className="relative">
                <HiOutlineUser className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="pl-12 h-14 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-[#ADFEB9] focus:ring-1 focus:ring-[#ADFEB9]/50 rounded-lg text-base"
                  placeholder="Choose a username"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="email"
                className="text-white text-base font-medium block"
              >
                Email Address
              </label>
              <div className="relative">
                <HiOutlineMail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-12 h-14 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-[#ADFEB9] focus:ring-1 focus:ring-[#ADFEB9]/50 rounded-lg text-base"
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-[#ADFEB9] text-black hover:bg-[#ADFEB9]/90 font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Creating account...
                </div>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-center text-gray-400 text-base">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#ADFEB9] hover:text-[#ADFEB9]/80 underline transition-colors font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-gray-500 text-sm leading-relaxed">
            By creating an account, you agree to our{" "}
            <span className="text-[#ADFEB9] hover:text-[#ADFEB9]/80 cursor-pointer transition-colors">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-[#ADFEB9] hover:text-[#ADFEB9]/80 cursor-pointer transition-colors">
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
