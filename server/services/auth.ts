import { compare, hash } from "bcryptjs";
import { db } from "../db";
import { users, type User } from "@shared/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

export class AuthService {
  async createInitialAdminUser() {
    try {
      // Check if admin exists
      const [existingAdmin] = await db.select()
        .from(users)
        .where(eq(users.username, 'admin'));

      if (!existingAdmin) {
        const password = 'admin123';
        const hashedPassword = await hash(password, SALT_ROUNDS);

        const [user] = await db.insert(users)
          .values({
            username: 'admin',
            password: hashedPassword,
            role: 'admin'
          })
          .returning();

        console.log('Created initial admin user:', user.username);
        return user;
      }

      return existingAdmin;
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    try {
      console.log(`Attempting to validate user: ${username}`);

      const [user] = await db.select()
        .from(users)
        .where(eq(users.username, username));

      if (!user) {
        console.log(`No user found with username: ${username}`);
        return null;
      }

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