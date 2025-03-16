import { compare, hash } from "bcryptjs";
import { db } from "../db";
import { users, type User } from "@shared/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

export class AuthService {
  async createInitialAdminUser() {
    try {
      // Delete any existing admin user first
      await db.delete(users).where(eq(users.username, 'admin'));

      // Create new admin user with correct password hash
      const password = 'admin123';
      const hashedPassword = await hash(password, SALT_ROUNDS);

      const [user] = await db.insert(users)
        .values({
          username: 'admin',
          password: hashedPassword,
          role: 'admin'
        })
        .returning();

      console.log('Created initial admin user with username:', user.username);
      return user;
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    try {
      console.log('Validating user:', username);

      const [user] = await db.select()
        .from(users)
        .where(eq(users.username, username));

      if (!user) {
        console.log('No user found with username:', username);
        return null;
      }

      const isValid = await compare(password, user.password);
      console.log('Password validation result:', isValid);

      return isValid ? user : null;
    } catch (error) {
      console.error('Error during user validation:', error);
      return null;
    }
  }

  async getUser(userId: number): Promise<User | null> {
    try {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId));
      return user || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async isAdmin(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.role === 'admin';
  }
}

export const authService = new AuthService();