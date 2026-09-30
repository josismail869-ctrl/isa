import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { enforceAuthRateLimit } from "./_core/authRateLimit";
import { sendAuthEmail } from "./_core/email";
import { ENV } from "./_core/env";
import {
  createOneTimeToken,
  hashOneTimeToken,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "./_core/passwordAuth";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import {
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  createPasswordAccount,
  createDailyUpdate,
  createMembershipRequest,
  deleteDailyUpdate,
  getPasswordCredential,
  getUnverifiedPasswordAccount,
  getLatestDailyUpdate,
  listAdminDailyUpdates,
  listAdminMembershipRequests,
  storeAuthToken,
  updateDailyUpdate,
  updateMembershipRequestStatus,
} from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(12).max(128);
const AUTH_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
function isValidAppBaseUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (!ENV.isProduction || url.protocol === "https:")
    );
  } catch {
    return false;
  }
}

const EMAIL_AUTH_READY = Boolean(
  ENV.databaseUrl &&
    ENV.resendApiKey &&
    ENV.emailFrom &&
    ENV.cookieSecret.length >= 32 &&
    isValidAppBaseUrl(ENV.appBaseUrl)
);

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    char =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]!
  );
}

function appLink(path: string, token: string) {
  const baseUrl = new URL(ENV.appBaseUrl);
  baseUrl.pathname = path;
  baseUrl.search = new URLSearchParams({ token }).toString();
  baseUrl.hash = "";
  return baseUrl.toString();
}

async function createLocalSession(
  ctx: TrpcContext,
  account: { openId: string; name: string }
) {
  if (ENV.cookieSecret.length < 32) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "JWT_SECRET must contain at least 32 characters.",
    });
  }
  const session = await sdk.signSession(
    {
      openId: account.openId,
      appId: ENV.appId || "local-password",
      name: account.name || "Member",
    },
    { expiresInMs: ONE_YEAR_MS }
  );
  ctx.res.cookie(COOKIE_NAME, session, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: ONE_YEAR_MS,
  });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    passwordAuthStatus: publicProcedure.query(() => ({
      ready: EMAIL_AUTH_READY,
    })),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    signUp: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(1).max(200),
          email: emailSchema,
          password: passwordSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        enforceAuthRateLimit(ctx.req, "signup", 5);
        if (!EMAIL_AUTH_READY) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Email sign-up is not configured. Set the database, email provider, sender, and session secret.",
          });
        }
        const email = normalizeEmail(input.email);
        const existing = await getPasswordCredential(email);
        if (!existing) {
          const account = await createPasswordAccount({
            name: input.name.trim(),
            email,
            passwordHash: await hashPassword(input.password),
          });
          const { token, tokenHash } = createOneTimeToken();
          await storeAuthToken({
            userId: account.userId,
            purpose: "verify_email",
            tokenHash,
            expiresAt: new Date(Date.now() + AUTH_TOKEN_TTL_MS),
          });
          await sendAuthEmail({
            to: email,
            subject: "Verify your XORTRON email",
            html: `<p>Hello ${escapeHtml(input.name.trim())},</p><p>Verify your email to activate your account.</p><p><a href="${escapeHtml(appLink("/auth/verify", token))}">Verify email</a></p><p>This link expires in 24 hours. If you did not request this, you can ignore this email.</p>`,
          });
        } else if (!existing.emailVerifiedAt) {
          const pending = await getUnverifiedPasswordAccount(email);
          if (pending) {
            const { token, tokenHash } = createOneTimeToken();
            await storeAuthToken({
              userId: pending.userId,
              purpose: "verify_email",
              tokenHash,
              expiresAt: new Date(Date.now() + AUTH_TOKEN_TTL_MS),
            });
            await sendAuthEmail({
              to: email,
              subject: "Verify your XORTRON email",
              html: `<p>Hello ${escapeHtml(pending.name ?? "there")},</p><p><a href="${escapeHtml(appLink("/auth/verify", token))}">Verify your email</a></p><p>This link expires in 24 hours.</p>`,
            });
          }
        }
        return {
          success: true as const,
          message:
            "If this address requires verification, a verification email has been sent.",
        };
      }),
    signIn: publicProcedure
      .input(
        z.object({ email: emailSchema, password: z.string().min(1).max(128) })
      )
      .mutation(async ({ ctx, input }) => {
        enforceAuthRateLimit(ctx.req, "signin", 8);
        if (!ENV.databaseUrl || ENV.cookieSecret.length < 32) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Email sign-in is not configured. Set the database and session secret.",
          });
        }
        const account = await getPasswordCredential(
          normalizeEmail(input.email)
        );
        if (
          !account ||
          !(await verifyPassword(input.password, account.passwordHash))
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email or password is incorrect.",
          });
        }
        if (!account.emailVerifiedAt) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Verify your email before signing in.",
          });
        }
        await createLocalSession(ctx, {
          openId: account.openId,
          name: account.name ?? "",
        });
        return { success: true as const };
      }),
    verifyEmail: publicProcedure
      .input(z.object({ token: z.string().min(32).max(128) }))
      .mutation(async ({ ctx, input }) => {
        enforceAuthRateLimit(ctx.req, "verify", 10);
        if (!EMAIL_AUTH_READY) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Email verification is not configured on this server.",
          });
        }
        const account = await consumeEmailVerificationToken(
          hashOneTimeToken(input.token),
          ENV.ownerEmail
        );
        if (!account)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This verification link is invalid, expired, or already used.",
          });
        await createLocalSession(ctx, {
          openId: account.openId,
          name: account.name,
        });
        return { success: true as const };
      }),
    resendVerification: publicProcedure
      .input(z.object({ email: emailSchema }))
      .mutation(async ({ ctx, input }) => {
        enforceAuthRateLimit(ctx.req, "resend-verification", 5);
        if (!EMAIL_AUTH_READY) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Email verification is not configured on this server.",
          });
        }
        const account = await getUnverifiedPasswordAccount(
          normalizeEmail(input.email)
        );
        if (account) {
          const { token, tokenHash } = createOneTimeToken();
          await storeAuthToken({
            userId: account.userId,
            purpose: "verify_email",
            tokenHash,
            expiresAt: new Date(Date.now() + AUTH_TOKEN_TTL_MS),
          });
          await sendAuthEmail({
            to: account.email,
            subject: "Verify your XORTRON email",
            html: `<p>Hello ${escapeHtml(account.name ?? "there")},</p><p><a href="${escapeHtml(appLink("/auth/verify", token))}">Verify your email</a></p><p>This link expires in 24 hours.</p>`,
          });
        }
        return {
          success: true as const,
          message:
            "If this address needs verification, an email has been sent.",
        };
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: emailSchema }))
      .mutation(async ({ ctx, input }) => {
        enforceAuthRateLimit(ctx.req, "password-reset", 5);
        if (!EMAIL_AUTH_READY) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Password reset is not configured on this server.",
          });
        }
        const account = await getPasswordCredential(
          normalizeEmail(input.email)
        );
        if (account?.emailVerifiedAt) {
          const { token, tokenHash } = createOneTimeToken();
          await storeAuthToken({
            userId: account.userId,
            purpose: "reset_password",
            tokenHash,
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          });
          await sendAuthEmail({
            to: account.email,
            subject: "Reset your XORTRON password",
            html: `<p><a href="${escapeHtml(appLink("/auth/reset", token))}">Reset your password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`,
          });
        }
        return {
          success: true as const,
          message:
            "If a verified account exists for this address, a reset email has been sent.",
        };
      }),
    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string().min(32).max(128),
          password: passwordSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        enforceAuthRateLimit(ctx.req, "reset-password", 8);
        if (!ENV.databaseUrl || ENV.cookieSecret.length < 32) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Password reset is not configured on this server.",
          });
        }
        const success = await consumePasswordResetToken(
          hashOneTimeToken(input.token),
          await hashPassword(input.password)
        );
        if (!success)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This reset link is invalid, expired, or already used.",
          });
        return { success: true as const };
      }),
  }),
  content: router({
    latestDailyUpdate: publicProcedure.query(() => getLatestDailyUpdate()),
  }),
  membership: router({
    requestAccess: protectedProcedure
      .input(z.object({ plan: z.enum(["standard", "vip"]) }))
      .mutation(({ ctx, input }) =>
        createMembershipRequest(ctx.user.id, input.plan)
      ),
  }),
  admin: router({
    membershipRequests: adminProcedure.query(() =>
      listAdminMembershipRequests()
    ),
    updateMembershipStatus: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["approved", "rejected"]),
        })
      )
      .mutation(({ input }) =>
        updateMembershipRequestStatus(input.id, input.status)
      ),
    dailyUpdates: adminProcedure.query(() => listAdminDailyUpdates()),
    createDailyUpdate: adminProcedure
      .input(
        z.object({
          title: z.string().trim().min(1).max(180),
          caption: z.string().trim().max(5000).nullable(),
          imageUrl: z.string().url().nullable(),
        })
      )
      .mutation(({ input }) => createDailyUpdate(input)),
    updateDailyUpdate: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          title: z.string().trim().min(1).max(180),
          caption: z.string().trim().max(5000).nullable(),
          imageUrl: z.string().url().nullable(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...update } = input;
        return updateDailyUpdate(id, update);
      }),
    deleteDailyUpdate: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => deleteDailyUpdate(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
