import * as bcrypt from 'bcryptjs';

export class HashUtil {
  private static readonly SALT_ROUNDS = 12;

  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async isValidHash(hash: string): Promise<boolean> {
    try {
      return !!(hash && hash.length === 60 && hash.startsWith('$2a$'));
    } catch {
      return false;
    }
  }
}