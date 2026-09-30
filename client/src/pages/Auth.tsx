import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";

type Mode = "signup" | "signin" | "forgot" | "reset" | "verify";

const messages: Record<Mode, { title: string; description: string }> = {
  signup: {
    title: "Create your account",
    description: "Verify your email before your first sign-in.",
  },
  signin: {
    title: "Welcome back",
    description: "Sign in with your verified email and password.",
  },
  forgot: {
    title: "Reset your password",
    description:
      "We'll email a single-use reset link if the account is verified.",
  },
  reset: {
    title: "Choose a new password",
    description: "Reset links expire after one hour and can only be used once.",
  },
  verify: {
    title: "Verify your email",
    description: "Confirm your email address to activate your account.",
  },
};

function getInitialMode(path: string): Mode {
  if (path.endsWith("/verify")) return "verify";
  if (path.endsWith("/reset")) return "reset";
  const requested = new URLSearchParams(window.location.search).get("mode");
  return requested === "signup" || requested === "forgot"
    ? requested
    : "signin";
}

export default function Auth() {
  const [location, setLocation] = useLocation();
  const { refresh } = useAuth();
  const mode = getInitialMode(location);
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const passwordStatus = trpc.auth.passwordAuthStatus.useQuery(undefined, {
    retry: false,
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const canSignInWithOAuth = Boolean(
    import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID
  );

  const signUp = trpc.auth.signUp.useMutation();
  const signIn = trpc.auth.signIn.useMutation();
  const verifyEmail = trpc.auth.verifyEmail.useMutation();
  const resendVerification = trpc.auth.resendVerification.useMutation();
  const requestReset = trpc.auth.requestPasswordReset.useMutation();
  const resetPassword = trpc.auth.resetPassword.useMutation();

  const busy =
    signUp.isPending ||
    signIn.isPending ||
    verifyEmail.isPending ||
    resendVerification.isPending ||
    requestReset.isPending ||
    resetPassword.isPending;
  const showPasswordSetupWarning =
    !passwordStatus.isLoading && !passwordStatus.data?.ready;

  useEffect(() => {
    if (mode !== "verify") return;
    if (!token) {
      setMessage({
        type: "error",
        text: "The verification link is missing its token.",
      });
      return;
    }
    verifyEmail.mutate(
      { token },
      {
        onSuccess: async () => {
          setMessage({
            type: "success",
            text: "Email verified. You are now signed in.",
          });
          await refresh();
          setTimeout(() => setLocation("/"), 1000);
        },
        onError: error => setMessage({ type: "error", text: error.message }),
      }
    );
  }, [mode, token]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (mode === "signup") {
      if (password !== confirmation) {
        setMessage({ type: "error", text: "Passwords do not match." });
        return;
      }
      signUp.mutate(
        { name, email, password },
        {
          onSuccess: result => {
            setPendingVerificationEmail(email);
            setMessage({ type: "success", text: result.message });
          },
          onError: error => setMessage({ type: "error", text: error.message }),
        }
      );
    } else if (mode === "signin") {
      signIn.mutate(
        { email, password },
        {
          onSuccess: async () => {
            await refresh();
            setLocation("/");
          },
          onError: error => {
            if (error.data?.code === "PRECONDITION_FAILED")
              setPendingVerificationEmail(email);
            setMessage({ type: "error", text: error.message });
          },
        }
      );
    } else if (mode === "forgot") {
      requestReset.mutate(
        { email },
        {
          onSuccess: result =>
            setMessage({ type: "success", text: result.message }),
          onError: error => setMessage({ type: "error", text: error.message }),
        }
      );
    } else if (mode === "reset") {
      if (password !== confirmation) {
        setMessage({ type: "error", text: "Passwords do not match." });
        return;
      }
      resetPassword.mutate(
        { token, password },
        {
          onSuccess: () => {
            setMessage({
              type: "success",
              text: "Password changed. Please sign in with your new password.",
            });
            setTimeout(() => setLocation("/auth?mode=signin"), 1200);
          },
          onError: error => setMessage({ type: "error", text: error.message }),
        }
      );
    }
  };

  const sendVerificationAgain = () => {
    resendVerification.mutate(
      { email: pendingVerificationEmail },
      {
        onSuccess: result =>
          setMessage({ type: "success", text: result.message }),
        onError: error => setMessage({ type: "error", text: error.message }),
      }
    );
  };

  const changeMode = (next: Mode) => {
    setMessage(null);
    setPendingVerificationEmail("");
    setLocation(
      next === "verify"
        ? "/auth/verify"
        : next === "reset"
          ? `/auth/reset?token=${encodeURIComponent(token)}`
          : `/auth?mode=${next}`
    );
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#0a0a0a] px-5 py-12 text-gray-100">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-black/80 p-7 shadow-2xl sm:p-9">
        <Link
          href="/"
          className="mb-7 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
        >
          <ArrowLeft size={16} /> Back to XORTRON
        </Link>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
          <ShieldCheck size={24} />
        </div>
        <h1 className="text-3xl font-bold">{messages[mode].title}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          {messages[mode].description}
        </p>

        {showPasswordSetupWarning && mode !== "verify" && (
          <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            Email accounts are not enabled on this server yet. The administrator
            must configure the database, Resend sender/API key, and session
            secret.
          </div>
        )}

        {mode === "verify" ? (
          <div className="mt-7">
            {verifyEmail.isPending && (
              <p className="flex items-center gap-2 text-sm text-gray-300">
                <Loader2 size={16} className="animate-spin" /> Verifying your
                email…
              </p>
            )}
            {message && (
              <p
                role="status"
                className={`rounded-lg p-4 text-sm ${message.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}
              >
                {message.text}
              </p>
            )}
            {message?.type === "error" && (
              <button
                onClick={() => changeMode("signin")}
                className="mt-5 text-sm text-blue-300 hover:text-blue-200"
              >
                Back to sign in
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <label className="block text-sm text-gray-300">
                Name
                <input
                  autoComplete="name"
                  required
                  maxLength={200}
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </label>
            )}
            {mode !== "reset" && (
              <label className="block text-sm text-gray-300">
                Email
                <input
                  autoComplete="email"
                  required
                  type="email"
                  maxLength={320}
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </label>
            )}
            {(mode === "signup" || mode === "signin" || mode === "reset") && (
              <label className="block text-sm text-gray-300">
                Password
                <input
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  required
                  type="password"
                  minLength={mode === "signin" ? 1 : 12}
                  maxLength={128}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
                {mode !== "signin" && (
                  <span className="mt-1 block text-xs text-gray-500">
                    Use at least 12 characters.
                  </span>
                )}
              </label>
            )}
            {(mode === "signup" || mode === "reset") && (
              <label className="block text-sm text-gray-300">
                Confirm password
                <input
                  autoComplete="new-password"
                  required
                  type="password"
                  minLength={12}
                  maxLength={128}
                  value={confirmation}
                  onChange={event => setConfirmation(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </label>
            )}

            {message && (
              <p
                role="status"
                className={`rounded-lg p-3 text-sm ${message.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}
              >
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || showPasswordSetupWarning}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Save new password"}
            </button>
          </form>
        )}

        {mode === "signin" && pendingVerificationEmail && (
          <button
            disabled={busy || showPasswordSetupWarning}
            onClick={sendVerificationAgain}
            className="mt-4 w-full rounded-lg border border-blue-500/30 px-4 py-3 text-sm text-blue-300 hover:bg-blue-500/10 disabled:opacity-50"
          >
            Resend verification email
          </button>
        )}
        {mode === "signin" && (
          <button
            onClick={() => changeMode("forgot")}
            className="mt-4 block w-full text-center text-sm text-gray-400 hover:text-blue-300"
          >
            Forgot password?
          </button>
        )}
        {mode === "signup" && pendingVerificationEmail && (
          <button
            disabled={busy || showPasswordSetupWarning}
            onClick={sendVerificationAgain}
            className="mt-4 w-full rounded-lg border border-blue-500/30 px-4 py-3 text-sm text-blue-300 hover:bg-blue-500/10 disabled:opacity-50"
          >
            Resend verification email
          </button>
        )}
        {(mode === "signin" || mode === "signup") && canSignInWithOAuth && (
          <button
            onClick={() => startLogin()}
            className="mt-4 w-full rounded-lg border border-white/15 px-4 py-3 text-sm text-gray-200 hover:bg-white/5"
          >
            Continue with existing OAuth
          </button>
        )}
        {(mode === "signin" || mode === "signup") && (
          <p className="mt-6 text-center text-sm text-gray-400">
            {mode === "signin" ? "New to XORTRON?" : "Already have an account?"}{" "}
            <button
              onClick={() =>
                changeMode(mode === "signin" ? "signup" : "signin")
              }
              className="font-semibold text-blue-300 hover:text-blue-200"
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>
        )}
        {mode === "forgot" && (
          <button
            onClick={() => changeMode("signin")}
            className="mt-5 block w-full text-center text-sm text-blue-300 hover:text-blue-200"
          >
            Back to sign in
          </button>
        )}

        <div className="mt-8 border-t border-white/10 pt-5 text-xs leading-5 text-gray-500">
          <p className="flex items-start gap-2">
            <MailCheck size={15} className="mt-0.5 shrink-0 text-blue-400" />
            Email verification is required before an account can sign in or
            access membership and admin features.
          </p>
        </div>
      </section>
    </main>
  );
}
