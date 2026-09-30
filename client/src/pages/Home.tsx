import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Capabilities", href: "#features" },
  { label: "Payment", href: "#payment" },
  { label: "Deploy", href: "#contact" },
];

const featureCards = [
  {
    icon: "⚡",
    title: "Ultra Low Latency",
    description:
      "Optimized delivery networks ensuring your data arrives before they even know it's moving.",
  },
  {
    icon: "🔒",
    title: "Hardened Security",
    description:
      "Encrypted endpoints and anti-forensic traces to keep the prying eyes out.",
  },
  {
    icon: "🛠️",
    title: "Modular Scale",
    description:
      "Expand your footprint instantly. Deploy from a single node to a global swarm.",
  },
];

const officialLinks = [
  { label: "YouTube", href: "https://www.youtube.com/@ProbashiVoicesymy" },
  { label: "WhatsApp", href: "https://wa.me/8801324360629" },
  { label: "X (Twitter)", href: "https://x.com/IsmailHossenDx" },
  { label: "Threads", href: "https://threads.com/@4d6dmktshe" },
  { label: "Email", href: "mailto:golapiloveyou557@gmail.com" },
];

const paymentMethods = [
  ["Beneficiary Name", "MD EJAN CHOWDHURY"],
  ["bKash / Nagad", "01863211541"],
  ["MyBank Account", "514012122490"],
];

export default function Home() {
  const { user } = useAuth();
  const passwordAuthStatus = trpc.auth.passwordAuthStatus.useQuery();
  const requestMembership = trpc.membership.requestAccess.useMutation({
    onSuccess: () => toast.success("Membership request submitted for admin review."),
    onError: error => toast.error(error.message),
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleChange = (field: "name" | "email" | "message", value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || !email || !message) {
      setFeedback({
        type: "error",
        message: "Error: All transmission parameters must be filled.",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFeedback({
        type: "error",
        message: "Error: Invalid communication channel address.",
      });
      return;
    }

    const subject = encodeURIComponent(`XORTRON inquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:golapiloveyou557@gmail.com?subject=${subject}&body=${body}`;
    setFeedback({
      type: "success",
      message: "Your email app is opening with the transmission prepared.",
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] antialiased">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="text-2xl font-bold tracking-tighter text-blue-500">
            XOR<span className="text-white">TRON</span>
          </div>

          <div className="hidden space-x-8 text-sm font-medium uppercase tracking-[0.2em] md:flex">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="transition hover:text-blue-500"
              >
                {item.label}
              </a>
            ))}
            {user?.role === "admin" && (
              <a href="/admin" className="transition hover:text-blue-500">
                Admin
              </a>
            )}
          </div>

          <div className="hidden md:block">
            <a
              href={
                user?.role === "admin"
                  ? "/admin"
                  : user
                    ? "/auth?mode=signin"
                    : "/auth?mode=signup"
              }
              className="glow rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              {user?.role === "admin"
                ? "ADMIN CONSOLE"
                : user
                  ? "SIGN IN"
                  : "CREATE ACCOUNT"}
            </a>
          </div>

          <button
            type="button"
            id="menuBtn"
            aria-label="Toggle Menu"
            aria-expanded={mobileOpen}
            className="text-gray-300 hover:text-white focus:outline-none md:hidden"
            onClick={() => setMobileOpen(open => !open)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        <div
          className={`${mobileOpen ? "block" : "hidden"} border-t border-white/10 bg-black/95 px-6 pb-6 pt-2 md:hidden`}
        >
          {navItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="mobile-link block py-1 text-sm uppercase tracking-[0.2em] text-white hover:text-blue-500"
            >
              {item.label}
            </a>
          ))}
          {user?.role === "admin" && (
            <a
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="mobile-link block py-1 text-sm uppercase tracking-[0.2em] text-white hover:text-blue-500"
            >
              Admin
            </a>
          )}
          <a
            href={
              user?.role === "admin"
                ? "/admin"
                : user
                  ? "/auth?mode=signin"
                  : "/auth?mode=signup"
            }
            onClick={() => setMobileOpen(false)}
            className="mt-2 block w-full rounded-full bg-blue-600 px-5 py-2 text-center text-sm font-bold text-white transition hover:bg-blue-700 glow"
          >
            {user?.role === "admin"
              ? "ADMIN CONSOLE"
              : user
                ? "SIGN IN"
                : "CREATE ACCOUNT"}
          </a>
        </div>
      </nav>

      <main>
        <section id="home" className="px-6 pb-20 pt-32">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="mb-6 text-5xl font-extrabold leading-tight md:text-7xl">
              Architecting{" "}
              <span className="text-blue-500">Digital Superiority.</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400">
              High-fidelity infrastructure for those who operate outside the
              noise. Fast, invisible, and uncompromising.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="#features"
                className="rounded-lg bg-white px-8 py-3 font-bold text-black transition hover:bg-gray-200"
              >
                View Specs
              </a>
              <a
                href="#contact"
                className="rounded-lg border border-white/20 px-8 py-3 font-bold text-white transition hover:bg-white/10"
              >
                Contact Ops
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="bg-white/5 px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold">Operational Assets</h2>
              <div className="mx-auto h-1 w-20 bg-blue-500" />
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {featureCards.map(card => (
                <div
                  key={card.title}
                  className="group rounded-2xl border border-white/10 bg-black p-8 transition hover:border-blue-500/50"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-blue-500 transition group-hover:scale-110">
                    <span className="text-2xl">{card.icon}</span>
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{card.title}</h3>
                  <p className="text-gray-400">{card.description}</p>
                </div>
              ))}
            </div>
            <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-white/10 bg-black/70 p-6 sm:p-8">
              <p className="font-mono text-xs tracking-[0.2em] text-blue-300">
                FEATURE AVAILABILITY
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-white">Public interface</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Landing page, feature cards, responsive menu, and form-field
                    validation are available.
                    The latency, security, and scale cards are showcase copy;
                    this project does not connect to those infrastructure services.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Email accounts</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {passwordAuthStatus.data?.ready
                      ? "Sign-up, verification, and password recovery are configured."
                      : "Sign-up and password recovery need the server database, Resend API key/sender, and session secret."}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    Member/admin data
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Membership and daily update tools need a configured
                    database. Admin changes are restricted on the server.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Contact form</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    The form checks its fields only. It does not send or save
                    messages until a delivery service is connected.
                  </p>
                </div>
              </div>
              <a
                href="/auth?mode=signup"
                className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Sign up / Sign in
              </a>
            </div>
            <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-blue-500/30 bg-blue-500/[0.06] p-6 sm:p-8">
              <p className="font-mono text-xs tracking-[0.2em] text-blue-300">
                MEMBERSHIP ACCESS
              </p>
              <h3 className="mt-3 text-2xl font-semibold">Choose a plan</h3>
              <p className="mt-2 text-sm text-gray-400">
                Sign in first, then submit a request. An administrator reviews
                the request before VIP access is granted.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {(["standard", "vip"] as const).map(plan => (
                  <button
                    key={plan}
                    type="button"
                    disabled={requestMembership.isPending}
                    onClick={() => {
                      if (!user) {
                        window.location.href = "/auth?mode=signin";
                        return;
                      }
                      requestMembership.mutate({ plan });
                    }}
                    className="rounded-lg border border-blue-400/40 px-5 py-3 font-bold capitalize text-blue-100 transition hover:bg-blue-500/20 disabled:opacity-50"
                  >
                    Request {plan}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="payment" className="border-t border-white/5 px-6 py-16">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
            <div>
              <p className="font-mono text-xs tracking-[0.2em] text-blue-300">
                PAYMENT METHOD
              </p>
              <h2 className="mt-3 text-3xl font-bold">Ready for membership setup</h2>
              <p className="mt-3 text-gray-400">
                Use the details below for manual payment. Keep your transaction
                ID and send it through the official email or WhatsApp channel
                for admin verification.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black p-6">
              {paymentMethods.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-white/10 py-3 last:border-0"
                >
                  <span className="text-sm text-gray-400">{label}</span>
                  <span className="text-right font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="px-6 py-20">
          <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-black p-10 shadow-2xl">
            <h2 className="mb-3 text-center text-3xl font-bold">Contact Ops</h2>
            <p className="mb-8 text-center text-sm text-gray-400">
              Submitting opens your email app with the message prepared for the
              official inbox.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-gray-400"
                >
                  Identifier (Name)
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={event => handleChange("name", event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white transition focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-400"
                >
                  Communication Channel (Email)
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={event => handleChange("email", event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white transition focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-medium text-gray-400"
                >
                  Transmission (Message)
                </label>
                <textarea
                  id="message"
                  rows={4}
                  required
                  value={form.message}
                  onChange={event =>
                    handleChange("message", event.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white transition focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="glow w-full rounded-lg bg-blue-600 py-3 text-base font-bold text-white transition hover:bg-blue-700"
              >
                SEND TRANSMISSION
              </button>
            </form>

            {feedback && (
              <div
                className={`mt-6 rounded-lg p-4 text-center font-medium ${
                  feedback.type === "error"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {feedback.message}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-10 text-center text-sm text-gray-600">
        <div className="mb-5 flex flex-wrap justify-center gap-x-5 gap-y-2 px-6 text-sm">
          {officialLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noreferrer" : undefined}
              className="text-gray-400 transition hover:text-blue-400"
            >
              {link.label}
            </a>
          ))}
        </div>
        &copy; 2026 XORTRON Systems. All rights reserved. Non-compliant.
      </footer>
    </div>
  );
}
