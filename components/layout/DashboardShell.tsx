"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import AccountSwitcher from "@/components/account/AccountSwitcher";

type Props = { children: React.ReactNode };

function initials(from: string): string {
  const base = (from || "").trim();
  if (!base) return "U";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const one = parts[0];
  if (one.includes("@")) return one.split("@")[0].slice(0, 2).toUpperCase();
  return one.slice(0, 2).toUpperCase();
}

export default function DashboardShell({ children }: Props) {
  const { data } = useSession();
  const displayName =
    data?.user?.name ??
    (data?.user?.email ? data.user.email.split("@")[0] : undefined) ??
    "Trader";

  const avatarText = initials(displayName);
  const isAdmin = !!data?.user?.isAdmin;

  const [openProfile, setOpenProfile] = useState(false);
  const [accOpen, setAccOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const pathname = usePathname();

  const openComingSoon = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setCourseOpen(true);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 88);
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* TOP NAVBAR (bounded like mockup: grows until 1536px, then stops) */}
      <div
        className="relative text-gray-700"
        style={{ backgroundColor: "#F6F6F8" }}
      >
        {/* Container: stops expanding on very large screens */}
        <div className="mx-auto w-full max-w-[1536px] px-6 py-4">
          <div className="flex items-center gap-4">
            {/* LEFT: Logo */}
            <div className="flex-none">
              <Link
                href="/"
                className="inline-flex items-center gap-3"
                aria-label="Stakk AI – Home"
                title="Stakk AI"
              >
                {/* Logo icon (keep your final svg here) */}
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Stakk AI logo"
                  role="img"
                >
                  <defs>
                    <linearGradient
                      id="bg"
                      x1="6"
                      y1="4"
                      x2="28"
                      y2="30"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0" stopColor="#E9D5FF" />
                      <stop offset="0.45" stopColor="#C084FC" />
                      <stop offset="0.75" stopColor="#A855F7" />
                      <stop offset="1" stopColor="#7C3AED" />
                    </linearGradient>
                    <radialGradient
                      id="gloss"
                      cx="0"
                      cy="0"
                      r="1"
                      gradientUnits="userSpaceOnUse"
                      gradientTransform="translate(11 9) rotate(135) scale(18 18)"
                    >
                      <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
                      <stop
                        offset="0.55"
                        stopColor="#FFFFFF"
                        stopOpacity="0.12"
                      />
                      <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <rect
                    x="1.25"
                    y="1.25"
                    width="29.5"
                    height="29.5"
                    rx="10.5"
                    fill="url(#bg)"
                  />
                  <rect
                    x="1.25"
                    y="1.25"
                    width="29.5"
                    height="29.5"
                    rx="10.5"
                    fill="url(#gloss)"
                  />

                  {/* White mark (placeholder) */}
                  <g transform="translate(16 16) rotate(35) translate(-16 -16)">
                    <path
                      d="M11.1 9.7 L21.3 9.2 L22.9 21.0 L12.7 21.5 Z"
                      fill="#FFFFFF"
                    />
                  </g>
                </svg>

                {/* Logo text */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-extrabold leading-none tracking-tight"
                    style={{ fontSize: 22, color: "#0F1220" }}
                  >
                    Stakk
                  </span>

                  <span
                    className="font-extrabold leading-none tracking-tight bg-clip-text text-transparent"
                    style={{
                      fontSize: 22,
                      backgroundImage:
                        "linear-gradient(90deg, #7C3AED 0%, #A855F7 100%)",
                    }}
                  >
                    AI
                  </span>
                </div>
              </Link>
            </div>

            {/* CENTER: Desktop nav centered (takes middle space) */}
            <div className="hidden xl:flex flex-1 justify-center">
              <nav className="flex items-center gap-3">
                <NavLink href="/dashboard" label="Home" pathname={pathname} />
                <NavLink
                  href="/journal"
                  label="Trading Journal"
                  pathname={pathname}
                />
                <NavLink
                  href="/strategies"
                  label="Strategy Creator"
                  pathname={pathname}
                />
                <NavLink
                  href="/exit-strategy"
                  label="Exit Strategy"
                  pathname={pathname}
                />
                <NavLink
                  href="/trade-analyzer"
                  label="Trade Analyzer"
                  pathname={pathname}
                />
                {isAdmin && (
                  <NavLink href="/admin" label="Admin" pathname={pathname} />
                )}
              </nav>
            </div>

            {/* RIGHT: Actions */}
            <div className="flex items-center gap-3 flex-none ml-auto">
              <button
                onClick={() => setAccOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white border px-4 py-2.5 shadow-sm hover:shadow-md transition-all"
                style={{ borderColor: "#E9E7F2" }}
                title="Switch account"
              >
                {/* Accounts icon (single star) */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2.8l1.8 5.1 5.2 1.9-5.2 1.9L12 16.8l-1.8-5.1-5.2-1.9 5.2-1.9L12 2.8z"
                    fill="#8B5CF6"
                  />
                </svg>
                <span className="text-gray-600 text-sm font-medium">
                  Accounts
                </span>
              </button>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setOpenProfile((v) => !v)}
                  className="flex items-center gap-2.5 rounded-full bg-white border px-4 py-2.5 shadow-sm hover:shadow-md transition-all"
                  style={{ borderColor: "#E9E7F2" }}
                >
                  <span className="h-7 w-7 rounded-full bg-violet-500 grid place-items-center overflow-hidden relative text-white text-xs font-semibold">
                    {data?.user?.image ? (
                      <Image
                        src={data.user.image}
                        alt="avatar"
                        fill
                        className="object-cover"
                        sizes="28px"
                      />
                    ) : (
                      avatarText
                    )}
                  </span>

                  <span className="hidden sm:inline font-bold text-gray-900 text-sm">
                    {displayName}
                  </span>
                </button>

                {openProfile && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-white text-gray-800 rounded-2xl shadow-xl p-2 z-50 border"
                    style={{ borderColor: "#E9E7F2" }}
                    onMouseLeave={() => setOpenProfile(false)}
                  >
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Hi, {displayName.split(" ")[0]}!
                    </div>
                    <MenuItem href="/profile" label="My profile" emoji="🙋‍♂️" />
                    <button
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 cursor-pointer"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                      <span className="text-lg">🚪</span> Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                className="inline-flex flex-col items-center justify-center rounded-xl border bg-white px-3 py-2 xl:hidden cursor-pointer"
                style={{ borderColor: "#E9E7F2" }}
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
              >
                <span className="block h-0.5 w-5 bg-gray-700 mb-1.5" />
                <span className="block h-0.5 w-5 bg-gray-700 mb-1.5" />
                <span className="block h-0.5 w-5 bg-gray-700" />
              </button>
            </div>
          </div>

          {/* Mobile dropdown (aligned to same container width) */}
          {mobileOpen && (
            <>
              <div
                className="fixed inset-0 z-[45] bg-black/30 xl:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <div
                id="mobile-nav"
                className="absolute left-0 right-0 top-full z-50 xl:hidden border-t backdrop-blur-sm"
                style={{
                  backgroundColor: "#F6F6F8",
                  borderColor: "#E9E7F2",
                }}
              >
                <div className="mx-auto w-full max-w-[1536px] px-6 py-3">
                  <ul className="grid gap-2 text-gray-700 animate-[fadeDown_160ms_ease-out]">
                    <li>
                      <Link
                        href="/dashboard"
                        className="block rounded-xl px-3 py-2 hover:bg-white/60"
                        onClick={() => setMobileOpen(false)}
                      >
                        Home
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/journal"
                        className="block rounded-xl px-3 py-2 hover:bg-white/60"
                        onClick={() => setMobileOpen(false)}
                      >
                        Trading Journal
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/strategies"
                        className="block rounded-xl px-3 py-2 hover:bg-white/60"
                        onClick={() => setMobileOpen(false)}
                      >
                        Strategy Creator
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/exit-strategy"
                        className="block rounded-xl px-3 py-2 hover:bg-white/60"
                        onClick={() => setMobileOpen(false)}
                      >
                        Exit Strategy
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/trade-analyzer"
                        className="block rounded-xl px-3 py-2 hover:bg-white/60"
                        onClick={() => setMobileOpen(false)}
                      >
                        Trade Analyzer
                      </Link>
                    </li>
                    {isAdmin && (
                      <li>
                        <Link
                          href="/admin"
                          className="block rounded-xl px-3 py-2 hover:bg-white/60"
                          onClick={() => setMobileOpen(false)}
                        >
                          Admin
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl md:max-w-none px-4 md:px-6 py-6 relative">
        <aside
          className={`hidden md:block fixed left-0 bottom-0 z-40 transition-all duration-300 ease-in-out bg-white shadow-lg ${
            isScrolled ? "top-0" : "top-[72px]"
          }`}
          onMouseEnter={() => setSidebarExpanded(true)}
          style={{
            width: sidebarExpanded ? "260px" : "64px",
          }}
        >
          <div className="h-full overflow-y-auto overflow-x-hidden">
            {sidebarExpanded && (
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex justify-end z-10">
                <button
                  onClick={() => setSidebarExpanded(false)}
                  className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                  title="Close sidebar"
                  aria-label="Close sidebar"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="px-3 pt-4 pb-3 flex justify-center">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 grid place-items-center text-white text-base font-semibold flex-shrink-0 overflow-hidden relative">
                {data?.user?.image ? (
                  <Image
                    src={data.user.image}
                    alt="avatar"
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  avatarText
                )}
              </div>
            </div>

            <nav className="px-2 pb-4">
              <ul className="grid gap-1">
                <NavItem
                  href="/dashboard"
                  label="Home"
                  icon="🏠"
                  showText={sidebarExpanded}
                  pathname={pathname}
                />
                <li>
                  <div className="flex items-center">
                    <Link
                      href="/journal"
                      className={`flex-1 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                        pathname === "/journal"
                          ? "bg-purple-50 text-purple-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-5 text-center flex-shrink-0 text-lg">
                        🗒️
                      </span>
                      <span
                        className="whitespace-nowrap text-sm font-medium overflow-hidden transition-all duration-300"
                        style={{
                          width: sidebarExpanded ? "auto" : "0",
                          opacity: sidebarExpanded ? 1 : 0,
                        }}
                      >
                        Trading Journal
                      </span>
                    </Link>
                  </div>

                  {sidebarExpanded && (
                    <ul className="mt-1 ml-4 grid gap-1 border-l-2 border-gray-100 pl-2">
                      <NavItem
                        href="/portfolio"
                        label="Portfolio Manager"
                        icon="💼"
                        showText={sidebarExpanded}
                        pathname={pathname}
                      />
                      <NavItem
                        href="/strategies"
                        label="Strategy Creator"
                        icon="🧭"
                        showText={sidebarExpanded}
                        pathname={pathname}
                      />
                      <NavItem
                        href="/trade-analyzer"
                        label="Trade Analyzer"
                        icon="📈"
                        showText={sidebarExpanded}
                        pathname={pathname}
                      />
                    </ul>
                  )}
                </li>

                <NavItem
                  href="/exit-strategy"
                  label="Exit Strategy Simulator"
                  icon="🚪"
                  showText={sidebarExpanded}
                  pathname={pathname}
                />

                <NavItem
                  href="/add-coin"
                  label="Coin Tracker"
                  icon="🔍"
                  showText={sidebarExpanded}
                  pathname={pathname}
                />

                {isAdmin && (
                  <NavItem
                    href="/admin"
                    label="Admin"
                    icon="🛡️"
                    showText={sidebarExpanded}
                    pathname={pathname}
                  />
                )}
              </ul>
            </nav>
          </div>
        </aside>

        <main
          className={`min-w-0 transition-all duration-300 ease-in-out ${
            sidebarExpanded ? "md:ml-[260px]" : "md:ml-[64px]"
          }`}
        >
          {children}
        </main>
      </div>

      {courseOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[1px] grid place-items-center"
          onClick={() => setCourseOpen(false)}
        >
          <div
            className="w-[440px] max-w-[92vw] rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold mb-2">Coming soon…</div>
            <p className="text-sm text-gray-600">
              Our Trading Course is almost ready. Stay tuned! 🚀
            </p>
            <div className="mt-4 text-right">
              <button
                className="rounded-xl bg-black text-white px-4 py-2 cursor-pointer"
                onClick={() => setCourseOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {accOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px]"
          onClick={() => setAccOpen(false)}
        >
          <div
            className="fixed right-4 top-16 w-[460px] max-w-[95vw] rounded-2xl bg-white text-gray-800 shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="font-semibold">Switch account</div>
              <button
                className="rounded-full px-2 py-1 text-gray-500 hover:bg-gray-100 cursor-pointer"
                onClick={() => setAccOpen(false)}
                aria-label="Close"
                title="Close"
              >
                ✖
              </button>
            </div>

            <div className="pt-3">
              <AccountSwitcher onClose={() => setAccOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname?: string;
}) {
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "px-4 py-2 rounded-full text-sm transition-all",
        isActive
          ? "font-semibold"
          : "text-gray-500 hover:text-gray-800 hover:bg-white/60",
      ].join(" ")}
      style={
        isActive
          ? {
              backgroundColor: "#EFE9FC",
              color: "#7C3AED",
            }
          : undefined
      }
    >
      {label}
    </Link>
  );
}

function NavItem({
  href,
  label,
  icon,
  showText = true,
  pathname,
}: {
  href: string;
  label: string;
  icon: string;
  showText?: boolean;
  pathname?: string;
}) {
  const isActive = pathname === href;

  return (
    <li>
      <Link
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
          isActive
            ? "bg-purple-50 text-purple-700"
            : "text-gray-700 hover:bg-gray-50"
        }`}
        href={href}
        title={!showText ? label : undefined}
      >
        <span className="w-5 text-center flex-shrink-0 text-lg">{icon}</span>
        <span
          className="whitespace-nowrap text-sm font-medium overflow-hidden transition-all duration-300"
          style={{
            width: showText ? "auto" : "0",
            opacity: showText ? 1 : 0,
          }}
        >
          {label}
        </span>
      </Link>
    </li>
  );
}

function MenuItem({
  href,
  label,
  emoji,
}: {
  href: string;
  label: string;
  emoji: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100"
    >
      <span className="text-lg">{emoji}</span> {label}
    </Link>
  );
}
