import fs from 'fs/promises';
import path from 'path';
import { PublicKey } from '@solana/web3.js';

export interface AddressBookEntry {
  id: string;
  name: string;
  type: 'wallet' | 'program' | 'token';
  address: string;
  category?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class AddressBook {
  private addressBookPath: string;
  private entries: Map<string, AddressBookEntry>;
  
  constructor(addressBookPath: string = './address-book') {
    this.addressBookPath = addressBookPath;
    this.entries = new Map();
  }
  
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.addressBookPath, { recursive: true });
      await this.loadEntries();
    } catch (error) {
      console.error('Error initializing address book:', error);
    }
  }
  
  private async loadEntries(): Promise<void> {
    try {
      const files = await fs.readdir(this.addressBookPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.addressBookPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const entry: AddressBookEntry = JSON.parse(content);
          this.entries.set(entry.id, entry);
        }
      }
      
      console.log(`Loaded ${this.entries.size} address book entries`);
    } catch (error) {
      console.error('Error loading address book:', error);
    }
  }
  
  async addEntry(entry: Omit<AddressBookEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `${entry.type}-${Date.now()}`;
    const newEntry: AddressBookEntry = {
      ...entry,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Validate address
    try {
      new PublicKey(entry.address);
    } catch (error) {
      throw new Error(`Invalid Solana address: ${entry.address}`);
    }
    
    this.entries.set(id, newEntry);
    await this.saveEntry(newEntry);
    return id;
  }
  
  async updateEntry(id: string, updates: Partial<Omit<AddressBookEntry, 'id' | 'createdAt'>>): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) {
      return false;
    }
    
    const updatedEntry = {
      ...entry,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.entries.set(id, updatedEntry);
    await this.saveEntry(updatedEntry);
    return true;
  }
  
  async deleteEntry(id: string): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) {
      return false;
    }
    
    try {
      const filePath = path.join(this.addressBookPath, `${id}.json`);
      await fs.unlink(filePath);
      this.entries.delete(id);
      return true;
    } catch (error) {
      console.error(`Error deleting entry ${id}:`, error);
      return false;
    }
  }
  
  private async saveEntry(entry: AddressBookEntry): Promise<void> {
    const filePath = path.join(this.addressBookPath, `${entry.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
  }
  
  getEntry(id: string): AddressBookEntry | undefined {
    return this.entries.get(id);
  }
  
  getAllEntries(): AddressBookEntry[] {
    return Array.from(this.entries.values());
  }
  
  getEntriesByType(type: 'wallet' | 'program' | 'token'): AddressBookEntry[] {
    return Array.from(this.entries.values()).filter(e => e.type === type);
  }
  
  searchEntries(query: string): AddressBookEntry[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.entries.values()).filter(entry =>
      entry.name.toLowerCase().includes(lowerQuery) ||
      entry.address.toLowerCase().includes(lowerQuery) ||
      entry.notes?.toLowerCase().includes(lowerQuery) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
  
  async exportToJSON(): Promise<string> {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      entries: Array.from(this.entries.values()),
    };
    return JSON.stringify(data, null, 2);
  }
  
  async importFromJSON(jsonData: string): Promise<number> {
    try {
      const data = JSON.parse(jsonData);
      let imported = 0;
      
      for (const entry of data.entries) {
        // Skip if already exists
        if (!this.entries.has(entry.id)) {
          this.entries.set(entry.id, entry);
          await this.saveEntry(entry);
          imported++;
        }
      }
      
      return imported;
    } catch (error) {
      console.error('Error importing address book:', error);
      throw error;
    }
  }
  
  copyToClipboard(id: string): string | null {
    const entry = this.entries.get(id);
    return entry ? entry.address : null;
  }
}
