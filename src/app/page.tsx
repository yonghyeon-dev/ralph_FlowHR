import Link from "next/link";

const features = [
  {
    icon: "\u{1F4CA}",
    title: "\uC6B4\uC601 \uB300\uC2DC\uBCF4\uB4DC",
    description:
      "\uACB0\uC7AC \uB300\uAE30, \uC608\uC678 \uBC1C\uC0DD, \uB9AC\uC2A4\uD06C \uC2DC\uADF8\uB110\uC744 \uC2E4\uC2DC\uAC04\uC73C\uB85C \uBAA8\uB2C8\uD130\uB9C1\uD569\uB2C8\uB2E4.",
  },
  {
    icon: "\u26A1",
    title: "\uC790\uB3D9\uD654 \uC6CC\uD06C\uD50C\uB85C",
    description:
      "\uACB0\uC7AC, \uC54C\uB9BC, \uBB38\uC11C \uBC1C\uC1A1\uC744 \uC870\uAC74\uBD80 \uC790\uB3D9 \uC2E4\uD589\uD569\uB2C8\uB2E4.",
  },
  {
    icon: "\u{1F4F1}",
    title: "\uC9C1\uC6D0 \uC140\uD504\uC11C\uBE44\uC2A4",
    description:
      "\uCD9C\uD1F4\uADFC, \uD734\uAC00 \uC2E0\uCCAD, \uC804\uC790\uC11C\uBA85\uC744 \uBAA8\uBC14\uC77C\uC5D0\uC11C \uCC98\uB9AC\uD569\uB2C8\uB2E4.",
  },
  {
    icon: "\u{1F465}",
    title: "People Hub",
    description:
      "\uC9C1\uC6D0\uBCC4 \uADFC\uD0DC, \uD734\uAC00, \uBB38\uC11C, \uACB0\uC7AC\uB97C \uD55C \uD654\uBA74\uC5D0\uC11C \uC5F0\uACB0\uD569\uB2C8\uB2E4.",
  },
  {
    icon: "\u{1F4B0}",
    title: "\uAE09\uC5EC \u00B7 \uC815\uC0B0",
    description:
      "\uAE09\uC5EC \uACC4\uC0B0\uBD80\uD130 \uB9C8\uAC10, \uBA85\uC138\uC11C \uBC30\uD3EC\uAE4C\uC9C0 \uD55C \uBC88\uC5D0 \uCC98\uB9AC\uD569\uB2C8\uB2E4.",
  },
  {
    icon: "\u{1F4C8}",
    title: "\uB9AC\uD3EC\uD2B8 \u00B7 \uC778\uC0AC\uC774\uD2B8",
    description:
      "\uC778\uC6D0, \uADFC\uD0DC \uCD94\uC774, \uC774\uC9C1\uB960, \uAE09\uC5EC \uBD84\uD3EC\uB97C \uC790\uB3D9 \uC9D1\uACC4\uD569\uB2C8\uB2E4.",
  },
];

const roles = [
  {
    icon: "\u2699\uFE0F",
    title: "Platform Operator",
    modules: "\uD14C\uB10C\uD2B8 \uAD00\uB9AC, \uACFC\uAE08, \uC9C0\uC6D0, \uBAA8\uB2C8\uD130\uB9C1, \uAC10\uC0AC",
    description: "SaaS \uC6B4\uC601 \uBC31\uC624\uD53C\uC2A4\uB97C \uD1B5\uD569 \uAD00\uB9AC\uD569\uB2C8\uB2E4.",
  },
  {
    icon: "\u{1F3E2}",
    title: "Tenant Admin",
    modules:
      "\uC778\uC0AC, \uADFC\uD0DC, \uD734\uAC00, \uACB0\uC7AC, \uBB38\uC11C, \uAE09\uC5EC, \uD3C9\uAC00, \uCC44\uC6A9",
    description: "\uACE0\uAC1D\uC0AC HR \uD300\uC758 \uC6B4\uC601 \uCF58\uC194\uC785\uB2C8\uB2E4.",
  },
  {
    icon: "\u{1F464}",
    title: "Tenant Employee",
    modules: "\uCD9C\uD1F4\uADFC, \uC694\uCCAD, \uC11C\uBA85, \uC77C\uC815, \uBB38\uC11C, \uB0B4 \uC815\uBCF4",
    description: "\uAC1C\uC778 \uC9C1\uC6D0\uC744 \uC704\uD55C \uC140\uD504\uC11C\uBE44\uC2A4 \uD3EC\uD138\uC785\uB2C8\uB2E4.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-sp-6 py-sp-4">
          <span className="text-2xl font-bold text-text-primary">
            Flow<span className="text-brand">HR</span>
          </span>
          <div className="flex items-center gap-sp-6">
            <a
              href="#features"
              className="hidden text-md font-medium text-text-secondary transition-colors duration-fast hover:text-brand sm:inline"
            >
              Features
            </a>
            <a
              href="#roles"
              className="hidden text-md font-medium text-text-secondary transition-colors duration-fast hover:text-brand sm:inline"
            >
              Roles
            </a>
            <Link
              href="/login"
              className="rounded-md bg-brand px-sp-5 py-sp-2 text-md font-semibold text-text-inverse transition-colors duration-fast hover:bg-brand-hover"
            >
              \uB85C\uADF8\uC778
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-sp-6 pb-sp-12 pt-[80px] text-center md:pt-[120px]">
        <div className="mx-auto max-w-[720px]">
          <span className="inline-block rounded-full bg-brand-soft px-sp-4 py-sp-2 text-sm font-medium text-brand-text">
            \u2726 HR \uC6B4\uC601\uC758 \uC0C8\uB85C\uC6B4 \uAE30\uC900
          </span>
          <h1 className="mt-sp-6 text-[36px] font-bold leading-tight text-text-primary md:text-[52px]">
            \uC0AC\uB78C \uC911\uC2EC\uC73C\uB85C
            <br />
            HR \uC6B4\uC601\uC744 \uC7AC\uC124\uACC4\uD558\uB2E4
          </h1>
          <p className="mt-sp-6 text-lg leading-relaxed text-text-secondary md:text-xl">
            \uADFC\uD0DC\u00B7\uD734\uAC00\u00B7\uACB0\uC7AC\u00B7\uBB38\uC11C\u00B7\uAE09\uC5EC\u00B7\uC131\uACFC\u00B7\uCC44\uC6A9\uAE4C\uC9C0,
            \uD750\uC5B4\uC9C0\uB294 \uD558\uB098\uC758 \uD50C\uB7AB\uD3FC\uC5D0\uC11C \uC6B4\uC601\uD558\uC138\uC694.
          </p>
          <div className="mt-sp-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-sp-2 rounded-lg bg-brand px-sp-8 py-sp-4 text-lg font-semibold text-text-inverse shadow-md transition-all duration-normal hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-lg"
            >
              \uC2DC\uC791\uD558\uAE30
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 10H16M16 10L11 5M16 10L11 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <p className="mt-sp-4 text-sm text-text-tertiary">
              \uBB34\uB8CC \uCCB4\uD5D8 14\uC77C \u00B7 \uCE74\uB4DC \uB4F1\uB85D \uC5C6\uC74C
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="bg-surface-canvas px-sp-6 py-[80px] md:py-[100px]"
      >
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-sp-12 text-center">
            <h2 className="text-3xl font-bold text-text-primary md:text-4xl">
              \uD575\uC2EC \uAE30\uB2A5
            </h2>
            <p className="mt-sp-3 text-lg text-text-secondary">
              HR \uC6B4\uC601\uC5D0 \uD544\uC694\uD55C \uBAA8\uB4E0 \uAE30\uB2A5\uC744 \uD558\uB098\uC758 \uD50C\uB7AB\uD3FC\uC5D0\uC11C
            </p>
          </div>
          <div className="grid gap-sp-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-surface-primary p-sp-8 shadow-xs transition-all duration-normal hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-sp-4 text-[32px]">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-text-primary">
                  {feature.title}
                </h3>
                <p className="mt-sp-2 text-md leading-relaxed text-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="px-sp-6 py-[80px] md:py-[100px]">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-sp-12 text-center">
            <h2 className="text-3xl font-bold text-text-primary md:text-4xl">
              \uC5ED\uD560\uBCC4 \uACBD\uD5D8
            </h2>
            <p className="mt-sp-3 text-lg text-text-secondary">
              \uAC01 \uC5ED\uD560\uC5D0 \uCD5C\uC801\uD654\uB41C \uC778\uD130\uD398\uC774\uC2A4\uB97C \uC81C\uACF5\uD569\uB2C8\uB2E4
            </p>
          </div>
          <div className="grid gap-sp-6 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role.title}
                className="rounded-xl border border-border bg-surface-primary p-sp-8 shadow-xs transition-all duration-normal hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-sp-4 text-[32px]">{role.icon}</div>
                <h3 className="text-xl font-semibold text-text-primary">
                  {role.title}
                </h3>
                <p className="mt-sp-2 text-sm font-medium text-brand">
                  {role.modules}
                </p>
                <p className="mt-sp-3 text-md leading-relaxed text-text-secondary">
                  {role.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-canvas px-sp-6 py-sp-10">
        <div className="mx-auto max-w-[1280px] text-center">
          <span className="text-lg font-bold text-text-primary">
            Flow<span className="text-brand">HR</span>
          </span>
          <p className="mt-sp-2 text-sm text-text-tertiary">
            &copy; 2026 FlowHR. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
