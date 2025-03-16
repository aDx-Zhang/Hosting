import { compare, hash } from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "../db";
import { users, apiKeys, type User } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

const SALT_ROUNDS = 10;

export class AuthService {
  async createUser(username: string, password: string, role: "admin" | "user" = "user"): Promise<User> {
    const hashedPassword = await hash(password, SALT_ROUNDS);
    const [user] = await db.insert(users)
      .values({
        username,
        password: hashedPassword,
        role
      })
      .returning();
    return user;
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return null;

    const isValid = await compare(password, user.password);
    return isValid ? user : null;
  }

  async generateApiKey(userId: number, durationDays: number): Promise<string> {
    const key = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    await db.insert(apiKeys).values({
      key,
      userId,
      expiresAt,
      active: 1
    });

    return key;
  }

  async validateApiKey(key: string): Promise<User | null> {
    const [apiKey] = await db.select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.key, key),
          eq(apiKeys.active, 1),
          gt(apiKeys.expiresAt, new Date())
        )
      );

    if (!apiKey) return null;

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, apiKey.userId));

    return user || null;
  }

  async isAdmin(userId: number): Promise<boolean> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));
    
    return user?.role === 'admin';
  }

  async listApiKeys(adminId: number): Promise<Array<any>> {
    if (!await this.isAdmin(adminId)) {
      throw new Error("Unauthorized");
    }

    return await db.select({
      id: apiKeys.id,
      key: apiKeys.key,
      userId: apiKeys.userId,
      username: users.username,
      expiresAt: apiKeys.expiresAt,
      active: apiKeys.active
    })
    .from(apiKeys)
    .leftJoin(users, eq(apiKeys.userId, users.id));
  }

  async deactivateApiKey(adminId: number, keyId: number): Promise<void> {
    if (!await this.isAdmin(adminId)) {
      throw new Error("Unauthorized");
    }

    await db.update(apiKeys)
      .set({ active: 0 })
      .where(eq(apiKeys.id, keyId));
  }
}

export const authService = new AuthService();
