"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BiEnvelope, BiLock, BiShield, BiWallet } from "react-icons/bi";
import { HiOutlineMail } from "react-icons/hi";
import Image from "next/image";
import GlitchText from "@/components/animations/glitch";
import { useRouter } from "next/navigation";
import WalletConnectionDialog from "@/components/wallet/WalletConnectionDialog";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "verification">("email");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const { login, verifyOTP, completeLoginWithOtp } = useAuth();
  const [otpID, setOtpID] = useState("");
  const router = useRouter();

  // Timer effect for OTP expiration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "verification" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    console.log("Login success state changed to:", loginSuccess);
    if (loginSuccess) {
      console.log("Login success detected, forcing step to verification");
      setStep("verification");
      setTimeLeft(600); // Reset timer
    }
  }, [loginSuccess]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submitted, preventing default behavior");
    setError("");
    setIsLoading(true);

    try {
      console.log("Attempting login for email:", email);
      console.log("Current step before login:", step);
      console.log("Current loading state:", isLoading);

      const result = await login(email);
      console.log("Login response:", result);

      // Capture the otpId from the login response
      if (result.otpId) {
        setOtpID(result.otpId);
        console.log("OTP ID captured:", result.otpId);
      } else {
        throw new Error("No OTP ID received from login");
      }

      console.log("Login successful, result:", result);
      console.log("Setting login success and step to verification");
      setLoginSuccess(true);
      setStep("verification");
      setError(""); // Clear any previous errors
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to send verification email";
      console.log("Setting error:", errorMessage);
      // If user not found, suggest registration
      if (
        errorMessage.includes("User not found") ||
        errorMessage.includes("no sub-organization associated")
      ) {
        setError(
          "Account not found. Please create an account first using the registration page."
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      console.log("Setting loading to false");
      setIsLoading(false);
      console.log("Loading set to false, current loading state:", isLoading);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-character code");
      return;
    }

    if (!otpID) {
      setError("OTP session expired. Please request a new code.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      console.log("Attempting OTP verification with:", { otpID, otp, email });
      // Pass all 3 required arguments: otpId, otpCode, email
      const result = await verifyOTP(otpID, otp, email);
      console.log("OTP verification successful:", result);
      const userData = await completeLoginWithOtp(email);

      if (userData) {
        router.replace("/dashboard");
      } else {
        throw new Error("Failed to get user data");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Invalid verification code";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setIsLoading(true);

    try {
      const result = await login(email);
      console.log("Resend login response:", result);

      // Capture the new otpId
      if (result.otpId) {
        setOtpID(result.otpId);
        console.log("New OTP ID captured:", result.otpId);
      } else {
        throw new Error("No OTP ID received from resend");
      }

      setTimeLeft(600); // Reset timer
      setError("");
    } catch (err) {
      console.error("Resend error:", err);
      setError("Failed to resend verification code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <div className="relative w-20 h-20">
              <div className="absolute -inset-3 bg-gradient-to-r from-[#ADFEB9]/20 to-white/20 rounded-full blur-xl z-0"></div>
              <Image
                src="/logo.svg"
                alt="IntentiFi Logo"
                width={80}
                height={80}
                className="w-20 h-20 relative z-10"
              />
            </div>
          </div>

          <h1 className="text-5xl font-light tracking-tight text-white mb-2">
            {step === "email" ? "Welcome to " : "Verify Your "}
            <span
              style={{ fontFamily: "InstrumentSerif" }}
              className="text-[#ADFEB9] italic"
            >
              <GlitchText
                text={step === "email" ? "IntentiFi" : "Email"}
                className="text-[#ADFEB9] hover:cursor-pointer"
              />
            </span>
          </h1>

          <p className="text-gray-400 text-lg">
            {step === "email"
              ? "Your strategy starts with a sentence"
              : "Enter the 6-character code sent to your email"}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          {error && (
            <div className="bg-red-950/50 border border-red-800/50 text-red-400 p-4 rounded-lg mb-6 text-base">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <div>
                  {error}
                  {error.includes("Account not found") && (
                    <div className="mt-2 text-sm">
                      <Link
                        href="/register"
                        className="text-[#ADFEB9] hover:text-[#ADFEB9]/80 underline font-medium"
                      >
                        Click here to create an account →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending verification...
                  </div>
                ) : (
                  "Send Verification Code"
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-gray-900 px-4 text-gray-400">or continue with</span>
                </div>
              </div>

              {/* Wallet Login Button */}
              <Button
                type="button"
                onClick={() => setWalletDialogOpen(true)}
                variant="outline"
                className="w-full h-14 border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700 hover:border-[#FA4C15]/50 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-base"
                disabled={isLoading}
              >
                <BiWallet className="w-5 h-5 mr-2" />
                Connect Wallet
              </Button>

              <div className="mt-8 pt-6 border-t border-gray-800">
                <p className="text-center text-gray-400 text-base">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="text-[#ADFEB9] hover:text-[#ADFEB9]/80 underline transition-colors font-medium"
                  >
                    Create one
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Email Display */}
              <div className="bg-gray-800/50 border border-gray-700 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <BiEnvelope className="h-5 w-5 text-[#FA4C15]" />
                  <div>
                    <p className="text-sm text-gray-400">
                      Verification code sent to:
                    </p>
                    <p className="font-medium text-white text-base break-all">
                      {email}
                    </p>
                  </div>
                </div>
              </div>

              {/* OTP Input Form */}
              <form onSubmit={handleOTPSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label
                    htmlFor="otp"
                    className="text-white text-base font-medium block"
                  >
                    Verification Code
                  </label>
                  <div className="relative">
                    <BiShield className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) =>
                        setOtp(
                          e.target.value
                            .replace(/[^a-zA-Z0-9]/g, "")
                            .toUpperCase()
                            .slice(0, 6)
                        )
                      }
                      className="pl-12 h-14 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-[#ADFEB9] focus:ring-1 focus:ring-[#ADFEB9]/50 rounded-lg text-base text-center tracking-[0.5em] font-mono"
                      maxLength={6}
                      required
                      disabled={isLoading}
                      autoComplete="one-time-code"
                    />
                  </div>
                  <p className="text-sm text-gray-400 text-center">
                    Enter the 6-character code from your email
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 bg-[#ADFEB9] text-black hover:bg-[#ADFEB9]/90 font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-base disabled:opacity-50"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </div>
                  ) : (
                  "Launch App"
                )}
              </Button>
              </form>

              {/* Timer and Info */}
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-sm bg-gray-800/30 border border-gray-700 px-3 py-2 rounded-lg">
                  <BiLock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">
                    Code expires in{" "}
                    <span
                      className={`font-mono ${timeLeft < 60 ? "text-red-400" : "text-[#ADFEB9]"}`}
                    >
                      {formatTime(timeLeft)}
                    </span>
                  </span>
                </div>

                {timeLeft === 0 && (
                  <div className="bg-red-950/50 border border-red-800/50 text-red-400 p-3 rounded-lg text-sm">
                    Your verification code has expired. Please request a new one.
                  </div>
                )}
              </div>

              {/* Resend and Back buttons */}
              <div className="pt-6 border-t border-gray-800 space-y-4">
                <p className="text-gray-400 text-base text-center">
                  Didn&apos;t receive the code?
                </p>
                <Button
                  type="button"
                  onClick={handleResendCode}
                  variant="outline"
                  className="w-full h-12 border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700 hover:border-[#ADFEB9]/50 rounded-lg"
                  disabled={isLoading || timeLeft > 540} // Disable for first 60 seconds
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </div>
                  ) : timeLeft > 540 ? (
                    `Resend in ${540 - timeLeft}s`
                  ) : (
                    "Resend verification code"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setOtp("");
                    setOtpID("");
                    setTimeLeft(600);
                  }}
                  className="text-gray-400 hover:text-[#ADFEB9] text-base transition-colors w-full"
                >
                  ← Back to email
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-gray-500 text-sm leading-relaxed">
            By continuing, you agree to our{" "}
            <span className="text-[#ADFEB9] hover:text-[#ADFEB9]/80 cursor-pointer transition-colors">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-[#ADFEB9] hover:text-[#ADFEB9]/80 cursor-pointer transition-colors">
              Privacy Policy
            </span>
          </p>
        </div>

        {/* Wallet Connection Dialog */}
        <WalletConnectionDialog
          open={walletDialogOpen}
          onOpenChange={setWalletDialogOpen}
          onSuccess={() => {
            router.replace("/dashboard");
          }}
        />
      </div>
    </div>
  );
}
