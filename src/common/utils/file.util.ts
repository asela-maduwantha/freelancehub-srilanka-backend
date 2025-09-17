import * as path from 'path';
import * as fs from 'fs';

export class FileUtil {
  static readonly ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  static readonly ALLOWED_DOCUMENT_TYPES = ['pdf', 'doc', 'docx', 'txt'];
  static readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  static getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase().slice(1);
  }

  static isImageFile(filename: string): boolean {
    const ext = this.getFileExtension(filename);
    return this.ALLOWED_IMAGE_TYPES.includes(ext);
  }

  static isDocumentFile(filename: string): boolean {
    const ext = this.getFileExtension(filename);
    return this.ALLOWED_DOCUMENT_TYPES.includes(ext);
  }

  static isValidFileSize(size: number): boolean {
    return size <= this.MAX_FILE_SIZE;
  }

  static generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${name}_${timestamp}_${random}${ext}`;
  }

  static sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static getMimeType(filename: string): string {
    const ext = this.getFileExtension(filename);
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}