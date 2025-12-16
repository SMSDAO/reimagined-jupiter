import { EncryptionService } from '../utils/encryption.js';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testPassword = 'test-password-123';
  const testData = 'sensitive-data-to-encrypt';

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data successfully', () => {
      const encrypted = encryptionService.encrypt(testData, testPassword);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);

      const decrypted = encryptionService.decrypt(encrypted, testPassword);
      expect(decrypted).toBe(testData);
    });

    it('should fail to decrypt with wrong password', () => {
      const encrypted = encryptionService.encrypt(testData, testPassword);
      
      expect(() => {
        encryptionService.decrypt(encrypted, 'wrong-password');
      }).toThrow();
    });

    it('should produce different ciphertext for same data (due to random IV)', () => {
      const encrypted1 = encryptionService.encrypt(testData, testPassword);
      const encrypted2 = encryptionService.encrypt(testData, testPassword);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // Both should decrypt to the same plaintext
      expect(encryptionService.decrypt(encrypted1, testPassword)).toBe(testData);
      expect(encryptionService.decrypt(encrypted2, testPassword)).toBe(testData);
    });
  });

  describe('hash', () => {
    it('should produce consistent hash for same input', () => {
      const hash1 = encryptionService.hash(testData);
      const hash2 = encryptionService.hash(testData);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = encryptionService.hash(testData);
      const hash2 = encryptionService.hash('different-data');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = encryptionService.generateSecurePassword(32);
      expect(password).toHaveLength(32);
    });

    it('should generate different passwords each time', () => {
      const password1 = encryptionService.generateSecurePassword(32);
      const password2 = encryptionService.generateSecurePassword(32);
      
      expect(password1).not.toBe(password2);
    });
  });

  describe('encryptPrivateKey and decryptPrivateKey', () => {
    const mockPrivateKey = 'mockPrivateKey123456789';

    it('should encrypt and decrypt private key', () => {
      const encrypted = encryptionService.encryptPrivateKey(mockPrivateKey, testPassword);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(mockPrivateKey);

      const decrypted = encryptionService.decryptPrivateKey(encrypted, testPassword);
      expect(decrypted).toBe(mockPrivateKey);
    });

    it('should throw error if private key is empty', () => {
      expect(() => {
        encryptionService.encryptPrivateKey('', testPassword);
      }).toThrow();
    });

    it('should throw error if password is empty', () => {
      expect(() => {
        encryptionService.encryptPrivateKey(mockPrivateKey, '');
      }).toThrow();
    });
  });

  describe('secureCompare', () => {
    it('should return true for identical strings', () => {
      const result = encryptionService.secureCompare('test123', 'test123');
      expect(result).toBe(true);
    });

    it('should return false for different strings', () => {
      const result = encryptionService.secureCompare('test123', 'test456');
      expect(result).toBe(false);
    });

    it('should return false for strings of different length', () => {
      const result = encryptionService.secureCompare('test', 'testing');
      expect(result).toBe(false);
    });
  });

  describe('encryptEnvVars and decryptEnvVars', () => {
    const testVars = {
      API_KEY: 'secret-api-key',
      DATABASE_URL: 'postgres://localhost:5432/db',
      SECRET_TOKEN: 'very-secret-token',
    };

    it('should encrypt and decrypt environment variables', () => {
      const encrypted = encryptionService.encryptEnvVars(testVars, testPassword);
      
      // All values should be encrypted
      Object.values(encrypted).forEach(value => {
        expect(value).not.toContain('secret');
        expect(value).not.toContain('postgres');
      });

      const decrypted = encryptionService.decryptEnvVars(encrypted, testPassword);
      expect(decrypted).toEqual(testVars);
    });

    it('should handle empty object', () => {
      const encrypted = encryptionService.encryptEnvVars({}, testPassword);
      expect(encrypted).toEqual({});

      const decrypted = encryptionService.decryptEnvVars({}, testPassword);
      expect(decrypted).toEqual({});
    });
  });
});
