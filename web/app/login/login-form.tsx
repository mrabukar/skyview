"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, XCircle } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSignIn } from "@/hooks/auth/sign-in";
import { getPostLoginRedirect } from "@/lib/auth/redirect";
import { cn } from "@/lib/utils";

function LoginPageBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#2a1712] px-4 py-8">
      {/* warm gradient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 80% -10%, rgba(249,167,42,0.28), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(249,167,42,0.16), transparent 55%), linear-gradient(160deg, #2a1712 0%, #3f201b 55%, #55321c 100%)",
        }}
      />
      {/* floating boba pearls */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          ["6%", "18%", 14, 0.10],
          ["12%", "72%", 22, 0.08],
          ["22%", "38%", 10, 0.12],
          ["82%", "24%", 18, 0.10],
          ["90%", "64%", 12, 0.12],
          ["72%", "82%", 26, 0.07],
          ["46%", "8%", 12, 0.09],
          ["58%", "90%", 14, 0.10],
        ].map(([left, top, size, opacity], i) => (
          <span
            key={i}
            className="absolute rounded-full bg-[#f9a72a]"
            style={{
              left: String(left),
              top: String(top),
              width: Number(size),
              height: Number(size),
              opacity: Number(opacity),
            }}
          />
        ))}
      </div>
      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
        {children}
      </div>
    </div>
  );
}

const inputClassName = cn(
  "flex h-11 w-full rounded-lg border border-[#e6d8c6] bg-[#faf6ef] px-3.5 py-2 text-sm text-[#2b1b12]",
  "transition-colors placeholder:text-[#b09a83]",
  "focus-visible:outline-none focus-visible:border-[#f9a72a] focus-visible:ring-2 focus-visible:ring-[#f9a72a]/35",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = getPostLoginRedirect(searchParams);
  const { isLoading: authLoading, isFetched, isAuthenticated } = useAuth();
  const signIn = useSignIn();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isFetched && isAuthenticated) {
      router.replace(returnUrl);
    }
  }, [isFetched, isAuthenticated, router, returnUrl]);

  const handleSubmit = async () => {
    if (!email || !pw) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setErrorMessage(null);

    try {
      await signIn.mutateAsync({ email, password: pw, rememberMe });
      router.push(returnUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Sign in failed.",
      );
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    if (signIn.isPending) return;
    setErrorMessage(null);
    // autofill the form so the client sees the credentials go in
    setEmail(demoEmail);
    setPw("demo1234");
    await new Promise((r) => setTimeout(r, 450));
    try {
      await signIn.mutateAsync({
        email: demoEmail,
        password: "demo1234",
        rememberMe,
      });
      router.push(returnUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Sign in failed.",
      );
    }
  };

  if (!isFetched || authLoading) {
    return (
      <LoginPageBackground>
        <div className="size-8 animate-spin rounded-full border-2 border-[#f9a72a] border-t-transparent" />
      </LoginPageBackground>
    );
  }

  return (
    <LoginPageBackground>
      <div className="w-full max-w-[440px]">
        <div className="overflow-hidden rounded-2xl bg-[#fffdf9] shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
          {/* amber top accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#f9a72a] via-[#e08e12] to-[#f9a72a]" />

          <div className="px-8 py-9 sm:px-10">
            {/* Brand */}
            <div className="mb-7 flex flex-col items-center text-center">
              <Image
                src="/skyview-logo.png"
                alt="Skyview Coffee logo"
                width={84}
                height={82}
                priority
              />
              <h1 className="mt-3 text-[22px] font-bold tracking-tight text-[#3f201b]">
                Bubble Tea Palace
              </h1>
              <p className="mt-0.5 text-[13px] italic text-[#9c6430]">
                “Good Tea. Good Time. All the Time!”
              </p>
            </div>

            {/* Demo credential badges — click to autofill and sign in */}
            <div className="mb-6 rounded-xl border border-dashed border-[#e8c98f] bg-[#fdf6e8] px-4 py-3">
              <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[#9c6430]">
                Demo access — click to sign in
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDemoLogin("admin@skyviewcoffee.co.ke")}
                  disabled={signIn.isPending}
                  className="rounded-full border border-[#3f201b]/15 bg-[#3f201b] px-3.5 py-1.5 text-[12px] font-semibold text-[#fdf6ec] transition-transform hover:scale-[1.03] hover:bg-[#55321c] disabled:opacity-50"
                >
                  ☕ Admin (Head Office)
                </button>
                <button
                  type="button"
                  onClick={() => void handleDemoLogin("manager@skyviewcoffee.co.ke")}
                  disabled={signIn.isPending}
                  className="rounded-full border border-[#e08e12]/30 bg-[#f9a72a] px-3.5 py-1.5 text-[12px] font-semibold text-[#3f201b] transition-transform hover:scale-[1.03] hover:bg-[#e08e12] disabled:opacity-50"
                >
                  🧋 Branch Manager
                </button>
              </div>
            </div>

            {errorMessage ? (
              <div
                className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
                role="alert"
              >
                <XCircle className="size-4 shrink-0" />
                {errorMessage}
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="text-sm font-medium text-[#3f201b]"
                >
                  Email address
                </label>
                <input
                  id="login-email"
                  className={inputClassName}
                  type="email"
                  placeholder="you@skyviewcoffee.co.ke"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage(null);
                  }}
                  disabled={signIn.isPending}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-[#3f201b]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    className={cn(inputClassName, "pr-10")}
                    type={show ? "text" : "password"}
                    placeholder="••••••••"
                    value={pw}
                    onChange={(e) => {
                      setPw(e.target.value);
                      setErrorMessage(null);
                    }}
                    disabled={signIn.isPending}
                    autoComplete="current-password"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSubmit();
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#b09a83] transition-colors hover:text-[#3f201b]"
                    onClick={() => setShow((s) => !s)}
                    tabIndex={-1}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <Checkbox
                  id="login-remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked === true)
                  }
                  disabled={signIn.isPending}
                />
                <label
                  htmlFor="login-remember"
                  className="cursor-pointer select-none text-sm text-[#9c6430]"
                >
                  Remember me
                </label>
              </div>
            </div>

            <Button
              className="mt-6 h-11 w-full rounded-lg bg-[#3f201b] text-[15px] font-semibold text-[#fdf6ec] hover:bg-[#55321c]"
              onClick={() => void handleSubmit()}
              disabled={signIn.isPending}
            >
              {signIn.isPending ? "Brewing…" : "Sign in"}
            </Button>
          </div>

          {/* footer strip */}
          <div className="border-t border-[#f0e6d6] bg-[#faf4ea] px-8 py-3.5 text-center">
            <p className="text-[12px] text-[#9c6430]">
              Skyview Coffee Ltd · Hub Karen · Runda Mall · Langata · Mombasa
            </p>
          </div>
        </div>
      </div>
    </LoginPageBackground>
  );
}
