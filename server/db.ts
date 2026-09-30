import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomUUID } from "node:crypto";
import {
  InsertUser,
  authTokens,
  dailyUpdates,
  membershipRequests,
  passwordCredentials,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { isConfiguredOwner } from "./_core/owner";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (
    isConfiguredOwner(user.openId, user.email, ENV.ownerOpenId, ENV.ownerEmail)
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function createMembershipRequest(userId: number, plan: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .insert(membershipRequests)
    .values({ userId, plan, status: "pending" });
  const result = await db
    .select()
    .from(membershipRequests)
    .where(eq(membershipRequests.userId, userId))
    .orderBy(desc(membershipRequests.createdAt))
    .limit(1);
  return result[0];
}

export async function getLatestDailyUpdate() {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(dailyUpdates)
    .orderBy(desc(dailyUpdates.publishedAt))
    .limit(1);
  return result[0] ?? null;
}

export async function listAdminMembershipRequests() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({
      id: membershipRequests.id,
      userId: membershipRequests.userId,
      plan: membershipRequests.plan,
      status: membershipRequests.status,
      notes: membershipRequests.notes,
      createdAt: membershipRequests.createdAt,
      updatedAt: membershipRequests.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(membershipRequests)
    .leftJoin(users, eq(membershipRequests.userId, users.id))
    .orderBy(desc(membershipRequests.createdAt));
}

export async function updateMembershipRequestStatus(
  requestId: number,
  status: "approved" | "rejected"
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db
    .select({ id: membershipRequests.id })
    .from(membershipRequests)
    .where(eq(membershipRequests.id, requestId))
    .limit(1);
  if (!existing[0]) throw new Error("Membership request not found");
  await db
    .update(membershipRequests)
    .set({ status })
    .where(eq(membershipRequests.id, requestId));
  return { success: true as const };
}

export async function listAdminDailyUpdates() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(dailyUpdates).orderBy(desc(dailyUpdates.publishedAt));
}

export async function createDailyUpdate(input: {
  title: string;
  caption: string | null;
  imageUrl: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(dailyUpdates).values(input);
  return { success: true as const };
}

export async function updateDailyUpdate(
  updateId: number,
  input: { title: string; caption: string | null; imageUrl: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db
    .select({ id: dailyUpdates.id })
    .from(dailyUpdates)
    .where(eq(dailyUpdates.id, updateId))
    .limit(1);
  if (!existing[0]) throw new Error("Daily update not found");
  await db
    .update(dailyUpdates)
    .set({ ...input, publishedAt: new Date() })
    .where(eq(dailyUpdates.id, updateId));
  return { success: true as const };
}

export async function deleteDailyUpdate(updateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db
    .select({ id: dailyUpdates.id })
    .from(dailyUpdates)
    .where(eq(dailyUpdates.id, updateId))
    .limit(1);
  if (!existing[0]) throw new Error("Daily update not found");
  await db.delete(dailyUpdates).where(eq(dailyUpdates.id, updateId));
  return { success: true as const };
}

export async function createPasswordAccount(input: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return db.transaction(async tx => {
    const [createdUser] = await tx
      .insert(users)
      .values({
        openId: `local_${randomUUID()}`,
        name: input.name,
        email: input.email,
        loginMethod: "email",
        role: "user",
      })
      .$returningId();

    if (!createdUser) throw new Error("Could not create user account");

    await tx.insert(passwordCredentials).values({
      userId: createdUser.id,
      email: input.email,
      passwordHash: input.passwordHash,
    });

    return { userId: createdUser.id };
  });
}

export async function getPasswordCredential(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db
    .select({
      userId: passwordCredentials.userId,
      email: passwordCredentials.email,
      passwordHash: passwordCredentials.passwordHash,
      emailVerifiedAt: passwordCredentials.emailVerifiedAt,
      openId: users.openId,
      name: users.name,
      role: users.role,
    })
    .from(passwordCredentials)
    .innerJoin(users, eq(passwordCredentials.userId, users.id))
    .where(eq(passwordCredentials.email, email))
    .limit(1);
  return result[0] ?? null;
}

export async function getUnverifiedPasswordAccount(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db
    .select({
      userId: passwordCredentials.userId,
      email: passwordCredentials.email,
      name: users.name,
    })
    .from(passwordCredentials)
    .innerJoin(users, eq(passwordCredentials.userId, users.id))
    .where(
      and(
        eq(passwordCredentials.email, email),
        isNull(passwordCredentials.emailVerifiedAt)
      )
    )
    .limit(1);
  return result[0] ?? null;
}

export async function storeAuthToken(input: {
  userId: number;
  purpose: "verify_email" | "reset_password";
  tokenHash: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    const now = new Date();
    await tx.delete(authTokens).where(lt(authTokens.expiresAt, now));
    await tx
      .update(authTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(authTokens.userId, input.userId),
          eq(authTokens.purpose, input.purpose),
          isNull(authTokens.consumedAt)
        )
      );
    await tx.insert(authTokens).values(input);
  });
}

export async function consumeEmailVerificationToken(
  tokenHash: string,
  ownerEmail: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const now = new Date();
    const result = await tx
      .select({
        id: authTokens.id,
        userId: authTokens.userId,
        email: passwordCredentials.email,
        openId: users.openId,
        name: users.name,
      })
      .from(authTokens)
      .innerJoin(
        passwordCredentials,
        eq(authTokens.userId, passwordCredentials.userId)
      )
      .innerJoin(users, eq(authTokens.userId, users.id))
      .where(
        and(
          eq(authTokens.tokenHash, tokenHash),
          eq(authTokens.purpose, "verify_email"),
          isNull(authTokens.consumedAt),
          gt(authTokens.expiresAt, now)
        )
      )
      .limit(1);
    const token = result[0];
    if (!token) return null;

    const [consumed] = await tx
      .update(authTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(authTokens.id, token.id),
          isNull(authTokens.consumedAt),
          gt(authTokens.expiresAt, now)
        )
      );
    if (consumed.affectedRows !== 1) return null;

    await tx
      .update(passwordCredentials)
      .set({ emailVerifiedAt: now })
      .where(eq(passwordCredentials.userId, token.userId));

    const isOwner = ownerEmail && token.email.toLowerCase() === ownerEmail;
    if (isOwner) {
      await tx
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.id, token.userId));
    }
    return { openId: token.openId, name: token.name ?? "", email: token.email };
  });
}

export async function consumePasswordResetToken(
  tokenHash: string,
  passwordHash: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const now = new Date();
    const result = await tx
      .select({ id: authTokens.id, userId: authTokens.userId })
      .from(authTokens)
      .where(
        and(
          eq(authTokens.tokenHash, tokenHash),
          eq(authTokens.purpose, "reset_password"),
          isNull(authTokens.consumedAt),
          gt(authTokens.expiresAt, now)
        )
      )
      .limit(1);
    const token = result[0];
    if (!token) return false;

    const [consumed] = await tx
      .update(authTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(authTokens.id, token.id),
          isNull(authTokens.consumedAt),
          gt(authTokens.expiresAt, now)
        )
      );
    if (consumed.affectedRows !== 1) return false;

    await tx
      .update(passwordCredentials)
      .set({ passwordHash })
      .where(eq(passwordCredentials.userId, token.userId));
    return true;
  });
}
