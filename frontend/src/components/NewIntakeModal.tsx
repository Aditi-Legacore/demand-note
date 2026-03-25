"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QuickIntakeForm from "./forms/QuickIntakeForm";
import { Button } from "@/components/ui/button";

export default function NewIntakeModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"email" | "otp" | "new" | "choice">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsEmbedded(window.self !== window.top);
    }
  }, []);

  const handleEmailSubmit = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Check if draft exists
      const checkRes = await fetch("/api/check-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();

      if (checkData.exists) {
        // Draft exists, show choice
        setMode("choice");
      } else {
        // No draft, go to new intake
        setMode("new");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithDraft = async () => {
    setLoading(true);
    setError("");

    try {
      // Send OTP
      const otpRes = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const otpData = await otpRes.json();

      if (otpRes.ok) {
        setMode("otp");
      } else {
        setError(otpData.error || "Failed to send OTP");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setMode("new");
  };

  const handleOtpSubmit = async () => {
    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (res.ok) {
        // Store draft data in localStorage
        localStorage.setItem("draftData", JSON.stringify(data.draft || {}));
        // For embed, navigate to the embed form with ref using the referenceId from draft
        const refId = data.draft?.referenceId || email;
        if (window.self !== window.top) {
          window.location.href = `/embed/form?ref=${refId}`;
        } else {
          router.push(`/intake-form?ref=${refId}`);
        }
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-900  w-full max-w-2xl p-4 shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h6 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Intake</h6>
          {!isEmbedded && (
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-red-600 text-lg">
              ✕
            </Button>
          )}
        </div>

        {/* Email Input */}
        {mode === "email" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter your email address
              </label>
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              />
            </div>
            <Button
              onClick={handleEmailSubmit}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Checking..." : "Continue"}
            </Button>
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          </div>
        )}

        {/* OTP Input */}
        {mode === "otp" && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                We found a draft for <strong>{email}</strong>. Enter the OTP sent to your email to continue.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="border rounded-lg p-3 w-full text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                maxLength={6}
              />
            </div>
            <Button
              onClick={handleOtpSubmit}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setMode("choice")}
              className="w-full"
            >
              Back
            </Button>
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          </div>
        )}

        {/* Choice */}
        {mode === "choice" && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                We found a draft for <strong>{email}</strong>. What would you like to do?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleContinueWithDraft}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Sending OTP..." : "Continue with Draft"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCreateNew}
                className="w-full"
              >
                Create New Form
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => setMode("email")}
              className="w-full"
            >
              Back
            </Button>
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          </div>
        )}

        {/* New Intake */}
        {mode === "new" && (
          <div className="space-y-0">
            <div className="text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                No existing draft found for <strong>{email}</strong>. Let&apos;s create a new intake.
              </p>
            </div>
            <QuickIntakeForm onClose={onClose} />
            <Button
              variant="ghost"
              onClick={() => setMode("email")}
              className="w-full py-1 bg-gray-200" 
              size="sm" 
            >
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
