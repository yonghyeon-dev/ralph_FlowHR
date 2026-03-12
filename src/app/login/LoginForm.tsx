"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

interface DemoUser {
  label: string;
  email: string;
  password: string;
  colorClass: string;
  icon: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    label: "Platform Operator로 로그인",
    email: "operator@flowhr.io",
    password: "demo1234!",
    colorClass: "bg-purple-100",
    icon: "⚙",
  },
  {
    label: "Tenant Admin으로 로그인",
    email: "admin@acme.example.com",
    password: "demo1234!",
    colorClass: "bg-brand-soft",
    icon: "🏢",
  },
  {
    label: "Tenant Employee로 로그인",
    email: "employee@acme.example.com",
    password: "demo1234!",
    colorClass: "bg-amber-100",
    icon: "👤",
  },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  async function handleDemoLogin(user: DemoUser) {
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: user.email,
      password: user.password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("데모 로그인에 실패했습니다. 시드 데이터를 확인하세요.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  async function handleOAuthLogin(provider: string) {
    await signIn(provider, { callbackUrl });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-canvas p-sp-8">
      <div className="grid min-h-[600px] w-full max-w-[960px] grid-cols-1 overflow-hidden rounded-xl bg-surface-primary shadow-lg md:grid-cols-2">
        {/* Left: Brand Panel */}
        <div className="hidden flex-col justify-center bg-gradient-to-br from-[#0d6a61] via-[#0b5a53] to-[#094e48] p-sp-10 text-white md:flex">
          <div className="mb-sp-6 text-3xl font-extrabold tracking-tight">
            FlowHR
          </div>
          <h2 className="mb-sp-4 text-2xl font-bold leading-tight">
            하나의 계정으로
            <br />
            모든 HR 업무를
          </h2>
          <p className="text-md leading-relaxed opacity-80">
            근태, 휴가, 결재, 문서, 급여, 평가까지.
            <br />
            하나의 플랫폼에서 모든 HR 업무를 처리하세요.
          </p>
        </div>

        {/* Right: Form Panel */}
        <div className="flex flex-col justify-center p-sp-10">
          <h1 className="mb-sp-2 text-3xl font-bold text-text-primary">
            로그인
          </h1>
          <p className="mb-sp-8 text-md text-text-secondary">
            이메일과 비밀번호를 입력하세요
          </p>

          <div className="max-w-[360px]">
            <form onSubmit={handleSubmit}>
              <div className="mb-sp-5">
                <label
                  htmlFor="email"
                  className="mb-sp-1 block text-sm font-medium text-text-secondary"
                >
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="h-[44px] w-full rounded-md border border-border bg-surface-primary px-sp-3 text-md text-text-primary transition-colors duration-fast focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/10"
                />
              </div>

              <div className="mb-sp-5">
                <label
                  htmlFor="password"
                  className="mb-sp-1 block text-sm font-medium text-text-secondary"
                >
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  required
                  className="h-[44px] w-full rounded-md border border-border bg-surface-primary px-sp-3 text-md text-text-primary transition-colors duration-fast focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/10"
                />
              </div>

              {error && (
                <p className="mb-sp-4 text-sm text-status-danger-text">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-[44px] w-full rounded-md bg-brand text-md font-semibold text-white transition-all duration-fast hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-sp-6 flex items-center gap-sp-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm text-text-tertiary">또는</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* SSO Buttons */}
            <div className="flex flex-col gap-sp-3">
              <button
                type="button"
                onClick={() => handleOAuthLogin("google")}
                disabled={loading}
                className="flex h-[44px] items-center justify-center gap-sp-2 rounded-md border border-border bg-surface-primary text-base font-medium text-text-primary transition-all duration-fast hover:border-border-strong hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google 계정으로 로그인
              </button>
              <button
                type="button"
                onClick={() => handleOAuthLogin("azure-ad")}
                disabled={loading}
                className="flex h-[44px] items-center justify-center gap-sp-2 rounded-md border border-border bg-surface-primary text-base font-medium text-text-primary transition-all duration-fast hover:border-border-strong hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                Microsoft 계정으로 로그인
              </button>
            </div>

            {/* Footer */}
            <div className="mt-sp-6 flex justify-between text-sm">
              <span className="cursor-pointer text-text-tertiary transition-colors hover:text-brand">
                비밀번호 찾기
              </span>
              <a
                href="/"
                className="text-text-tertiary transition-colors hover:text-brand"
              >
                ← 홈으로
              </a>
            </div>

            {/* Demo Quick Access */}
            <div className="mt-sp-8 rounded-md border border-border bg-surface-secondary p-sp-4">
              <div className="mb-sp-3 text-sm font-semibold text-text-secondary">
                🎯 데모 빠른 접근
              </div>
              <div className="flex flex-col gap-sp-2">
                {DEMO_USERS.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => handleDemoLogin(user)}
                    disabled={loading}
                    className="flex items-center gap-sp-3 rounded-sm px-sp-3 py-sp-2 text-left text-sm text-text-primary transition-colors hover:bg-surface-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md text-xs ${user.colorClass}`}
                    >
                      {user.icon}
                    </span>
                    {user.label}
                    <span className="ml-auto text-text-tertiary">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
