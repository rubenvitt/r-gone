import fs from 'fs/promises';
import path from 'path';
import { EncryptedDataFile } from '@/types/data';

export class FileService {
    private dataDir: string;

    constructor() {
        // In Produktion sollte dies ein geschütztes Verzeichnis sein
        this.dataDir = path.join(process.cwd(), 'data');
    }

    private getFilePath(userId: string): string {
        return path.join(this.dataDir, `${userId}.encrypted`);
    }

    async saveEncryptedData(userId: string, data: EncryptedDataFile): Promise<void> {
        const filePath = this.getFilePath(userId);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(data));
    }

    async getEncryptedData(userId: string): Promise<EncryptedDataFile | null> {
        try {
            const filePath = this.getFilePath(userId);
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
}