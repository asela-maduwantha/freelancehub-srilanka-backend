import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as forge from 'node-forge';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedMessage {
  encryptedContent: string;
  iv: string;
  messageHash: string;
}

export interface ConversationKey {
  key: string;
  version: string;
  algorithm: string;
}

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits

  /**
   * Generate a new RSA key pair for a user
   */
  generateKeyPair(): KeyPair {
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

    return {
      publicKey: publicKeyPem,
      privateKey: privateKeyPem,
    };
  }

  /**
   * Generate a new symmetric key for a conversation
   */
  generateConversationKey(): ConversationKey {
    const key = crypto.randomBytes(this.keyLength);
    const version = this.generateKeyVersion();

    return {
      key: key.toString('hex'),
      version,
      algorithm: this.algorithm,
    };
  }

  /**
   * Encrypt a conversation key share with a user's public key
   */
  encryptKeyShare(keyShare: string, publicKeyPem: string): string {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const encrypted = publicKey.encrypt(keyShare, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    });

    return forge.util.encode64(encrypted);
  }

  /**
   * Decrypt a conversation key share with a user's private key
   */
  decryptKeyShare(encryptedKeyShare: string, privateKeyPem: string): string {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const encrypted = forge.util.decode64(encryptedKeyShare);

    const decrypted = privateKey.decrypt(encrypted, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    });

    return decrypted;
  }

  /**
   * Encrypt a message using symmetric encryption
   */
  encryptMessage(message: string, conversationKey: string): EncryptedMessage {
    const iv = crypto.randomBytes(this.ivLength);
    const key = Buffer.from(conversationKey, 'hex');

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    cipher.setAAD(Buffer.from('message'));

    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine encrypted content with auth tag
    const encryptedContent = encrypted + authTag.toString('hex');

    // Generate message hash for integrity verification
    const messageHash = crypto.createHash('sha256').update(message).digest('hex');

    return {
      encryptedContent,
      iv: iv.toString('hex'),
      messageHash,
    };
  }

  /**
   * Decrypt a message using symmetric encryption
   */
  decryptMessage(encryptedMessage: EncryptedMessage, conversationKey: string): string {
    const { encryptedContent, iv, messageHash } = encryptedMessage;

    // Separate encrypted content from auth tag
    const authTagLength = 32; // 16 bytes in hex = 32 characters
    const encrypted = encryptedContent.slice(0, -authTagLength);
    const authTag = encryptedContent.slice(-authTagLength);

    const key = Buffer.from(conversationKey, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, key, ivBuffer);
    decipher.setAAD(Buffer.from('message'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Verify message integrity
    const computedHash = crypto.createHash('sha256').update(decrypted).digest('hex');
    if (computedHash !== messageHash) {
      throw new Error('Message integrity verification failed');
    }

    return decrypted;
  }

  /**
   * Derive the shared conversation key from key shares
   */
  deriveConversationKey(keyShare1: string, keyShare2: string): string {
    // Simple key derivation - in production, use proper key derivation function
    const combined = keyShare1 + keyShare2;
    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    return hash;
  }

  /**
   * Generate a unique key version
   */
  private generateKeyVersion(): string {
    return `v${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Validate a public key format
   */
  validatePublicKey(publicKeyPem: string): boolean {
    try {
      forge.pki.publicKeyFromPem(publicKeyPem);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate a private key format
   */
  validatePrivateKey(privateKeyPem: string): boolean {
    try {
      forge.pki.privateKeyFromPem(privateKeyPem);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a secure random string for additional entropy
   */
  generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a password or sensitive data
   */
  hashData(data: string, salt?: string): string {
    const saltValue = salt || crypto.randomBytes(16).toString('hex');
    return crypto.createHash('sha256').update(data + saltValue).digest('hex');
  }
}
