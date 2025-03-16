import { compare, hash } from "bcryptjs";
import { db } from "../db";
import { users, type User } from "@shared/schema";
import { eq } from "drizzle-orm";

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

  async isAdmin(userId: number): Promise<boolean> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));

    return user?.role === 'admin';
  }
}

export const authService = new AuthService();