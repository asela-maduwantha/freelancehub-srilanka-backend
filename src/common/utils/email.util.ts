import { AUTH_CONSTANTS } from '../constants/auth.constants';

export class EmailUtil {
  static isValid(email: string): boolean {
    return AUTH_CONSTANTS.EMAIL_REGEX.test(email);
  }

  static normalize(email: string): string {
    return email.toLowerCase().trim();
  }

  static getDomain(email: string): string {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : '';
  }

  static getLocalPart(email: string): string {
    const parts = email.split('@');
    return parts.length === 2 ? parts[0] : '';
  }

  static maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    
    const maskedLocal = localPart.length > 2 
      ? localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1)
      : localPart;
    
    return `${maskedLocal}@${domain}`;
  }

  static isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com'
    ];
    const domain = this.getDomain(email);
    return disposableDomains.includes(domain);
  }

  static extractDisplayName(fullName: string): string {
    return fullName.trim().replace(/[<>]/g, '');
  }
}