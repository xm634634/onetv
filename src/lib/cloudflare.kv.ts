import { AdminConfig } from './admin.types';
import { hashPassword, verifyPassword, isHashed } from './password-web';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';

interface KVNamespace {
  get(key: string, type?: string): Promise<any>;
  put(key: string, value: any, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<{ keys: { name: string }[] }>;
}

interface Env {
  KV: KVNamespace;
}

export class CloudflareKVStorage implements IStorage {
  private kv: KVNamespace;

  constructor(env: Env) {
    this.kv = env.KV;
  }

  async getPlayRecord(userName: string, key: string): Promise<PlayRecord | null> {
    const records = await this.getAllPlayRecords(userName);
    return records[key] || null;
  }

  async setPlayRecord(userName: string, key: string, record: PlayRecord): Promise<void> {
    const records = await this.getAllPlayRecords(userName);
    records[key] = record;
    await this.kv.put(`u:${userName}:pr`, JSON.stringify(records));
  }

  async getAllPlayRecords(userName: string): Promise<{ [key: string]: PlayRecord }> {
    const data = await this.kv.get(`u:${userName}:pr`, 'text');
    return data ? JSON.parse(data) : {};
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    const records = await this.getAllPlayRecords(userName);
    delete records[key];
    await this.kv.put(`u:${userName}:pr`, JSON.stringify(records));
  }

  async deleteAllPlayRecords(userName: string): Promise<void> {
    await this.kv.put(`u:${userName}:pr`, JSON.stringify({}));
  }

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    const favorites = await this.getAllFavorites(userName);
    return favorites[key] || null;
  }

  async setFavorite(userName: string, key: string, favorite: Favorite): Promise<void> {
    const favorites = await this.getAllFavorites(userName);
    favorites[key] = favorite;
    await this.kv.put(`u:${userName}:fav`, JSON.stringify(favorites));
  }

  async getAllFavorites(userName: string): Promise<{ [key: string]: Favorite }> {
    const data = await this.kv.get(`u:${userName}:fav`, 'text');
    return data ? JSON.parse(data) : {};
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    const favorites = await this.getAllFavorites(userName);
    delete favorites[key];
    await this.kv.put(`u:${userName}:fav`, JSON.stringify(favorites));
  }

  async deleteAllFavorites(userName: string): Promise<void> {
    await this.kv.put(`u:${userName}:fav`, JSON.stringify({}));
  }

  async registerUser(userName: string, password: string): Promise<void> {
    const hashedPassword = await hashPassword(password);
    await this.kv.put(`u:${userName}:pwd`, hashedPassword);
    const users = await this.getAllUsers();
    if (!users.includes(userName)) {
      users.push(userName);
      await this.kv.put('sys:users', JSON.stringify(users));
    }
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    const stored = await this.kv.get(`u:${userName}:pwd`, 'text');
    if (!stored) return false;
    if (isHashed(stored)) {
      return await verifyPassword(password, stored);
    }
    return stored === password;
  }

  async checkUserExist(userName: string): Promise<boolean> {
    const stored = await this.kv.get(`u:${userName}:pwd`, 'text');
    return stored !== null;
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    const hashedPassword = await hashPassword(newPassword);
    await this.kv.put(`u:${userName}:pwd`, hashedPassword);
  }

  async deleteUser(userName: string): Promise<void> {
    await this.kv.delete(`u:${userName}:pwd`);
    await this.kv.delete(`u:${userName}:pr`);
    await this.kv.delete(`u:${userName}:fav`);
    await this.kv.delete(`u:${userName}:sh`);
    await this.kv.delete(`u:${userName}:skip`);
    const users = await this.getAllUsers();
    const filtered = users.filter((u) => u !== userName);
    await this.kv.put('sys:users', JSON.stringify(filtered));
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    const data = await this.kv.get(`u:${userName}:sh`, 'text');
    return data ? JSON.parse(data) : [];
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    const history = await this.getSearchHistory(userName);
    const trimmed = keyword.trim();
    if (!trimmed) return;
    const newHistory = [trimmed, ...history.filter((k) => k !== trimmed)].slice(0, 50);
    await this.kv.put(`u:${userName}:sh`, JSON.stringify(newHistory));
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    if (keyword) {
      const history = await this.getSearchHistory(userName);
      const filtered = history.filter((k) => k !== keyword.trim());
      await this.kv.put(`u:${userName}:sh`, JSON.stringify(filtered));
    } else {
      await this.kv.put(`u:${userName}:sh`, JSON.stringify([]));
    }
  }

  async getAllUsers(): Promise<string[]> {
    const data = await this.kv.get('sys:users', 'text');
    return data ? JSON.parse(data) : [];
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    const data = await this.kv.get('admin:config', 'text');
    return data ? JSON.parse(data) : null;
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    await this.kv.put('admin:config', JSON.stringify(config));
  }

  async getSkipConfig(userName: string, source: string, id: string): Promise<SkipConfig | null> {
    const configs = await this.getAllSkipConfigs(userName);
    const key = `${source}+${id}`;
    return configs[key] || null;
  }

  async setSkipConfig(userName: string, source: string, id: string, config: SkipConfig): Promise<void> {
    const configs = await this.getAllSkipConfigs(userName);
    const key = `${source}+${id}`;
    configs[key] = config;
    await this.kv.put(`u:${userName}:skip`, JSON.stringify(configs));
  }

  async deleteSkipConfig(userName: string, source: string, id: string): Promise<void> {
    const configs = await this.getAllSkipConfigs(userName);
    const key = `${source}+${id}`;
    delete configs[key];
    await this.kv.put(`u:${userName}:skip`, JSON.stringify(configs));
  }

  async getAllSkipConfigs(userName: string): Promise<{ [key: string]: SkipConfig }> {
    const data = await this.kv.get(`u:${userName}:skip`, 'text');
    return data ? JSON.parse(data) : {};
  }

  async migrateData(): Promise<void> {
    console.log('Cloudflare KV: No data migration needed');
  }

  async migratePasswords(): Promise<void> {
    const users = await this.getAllUsers();
    for (const userName of users) {
      const stored = await this.kv.get(`u:${userName}:pwd`, 'text');
      if (stored && !stored.includes(':')) {
        console.log(`User ${userName} has plaintext password, needs migration`);
      }
    }
  }

  async clearAllData(): Promise<void> {
    const keys = await this.kv.list();
    for (const key of keys.keys) {
      await this.kv.delete(key.name);
    }
  }
}
