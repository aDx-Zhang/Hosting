import { compare, hash } from "bcryptjs";
import { db } from "../db";
import { users, type User } from "@shared/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

export class AuthService {
  async createUser(username: string, password: string, role: "admin" | "user" = "user"): Promise<User> {
    const hashedPassword = await hash(password, SALT_ROUNDS);
    console.log(`Creating user ${username} with role ${role}`);

    // Create user with hashed password
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
    try {
      // Find user by username
      const [user] = await db.select()
        .from(users)
        .where(eq(users.username, username));

      if (!user) {
        console.log(`No user found with username: ${username}`);
        return null;
      }

      // Compare password
      console.log(`Found user ${username}, comparing passwords...`);
      const isValid = await compare(password, user.password);
      console.log(`Password validation result for ${username}: ${isValid}`);

      return isValid ? user : null;
    } catch (error) {
      console.error('Error validating user:', error);
      return null;
    }
  }

  async isAdmin(userId: number): Promise<boolean> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));

    return user?.role === 'admin';
  }
}

export const authService = new AuthService();