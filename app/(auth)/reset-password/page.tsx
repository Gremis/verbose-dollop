"use client";

import { Suspense, FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Validação client-side
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!token) {
      setError("Invalid reset link.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  // Token inválido ou ausente
  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-50">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm border border-neutral-200">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>

            <h1 className="mb-2 text-xl font-semibold">Invalid reset link</h1>
            <p className="mb-6 text-sm text-neutral-600">
              This password reset link is invalid or has expired.
            </p>

            <Link
              href="/auth/forgot-password"
              className="inline-block w-full rounded-lg bg-violet-600 py-2 text-white hover:bg-violet-700 text-center"
            >
              Request new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Sucesso
  if (success) {
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-50">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm border border-neutral-200">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg
                className="h-6 w-6 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="mb-2 text-xl font-semibold">Password updated!</h1>
            <p className="mb-6 text-sm text-neutral-600">
              Your password has been successfully updated. Redirecting to
              login...
            </p>

            <Link
              href="/login"
              className="inline-block w-full rounded-lg bg-violet-600 py-2 text-white hover:bg-violet-700 text-center"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Formulário
  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm border border-neutral-200"
      >
        <h1 className="mb-2 text-xl font-semibold">Reset your password</h1>
        <p className="mb-6 text-sm text-neutral-600">
          Enter your new password below.
        </p>

        <div className="mb-3">
          <label className="block text-sm mb-1">New Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
            disabled={loading}
            minLength={6}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-1">Confirm Password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
            disabled={loading}
            minLength={6}
          />
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet-600 py-2 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Updating..." : "Reset password"}
        </button>

        <p className="mt-4 text-sm text-neutral-600 text-center">
          Remember your password?{" "}
          <Link href="/login" className="text-violet-700 underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">Loading…</div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
