import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly provider: string;
    private readonly localDir: string;
    private readonly s3Bucket: string;
    private readonly s3Region: string;

    constructor(private readonly config: ConfigService) {
        this.provider = this.config.get('STORAGE_PROVIDER', 'local');
        this.localDir = this.config.get('STORAGE_LOCAL_DIR', './uploads');
        this.s3Bucket = this.config.get('S3_BUCKET', '');
        this.s3Region = this.config.get('S3_REGION', 'eu-west-1');
    }

    async upload(file: Buffer, originalName: string, folder: string = 'general'): Promise<string> {
        const ext = path.extname(originalName);
        const hash = crypto.createHash('md5').update(file).digest('hex').substring(0, 12);
        const key = `${folder}/${Date.now()}-${hash}${ext}`;

        if (this.provider === 's3') {
            return this.uploadToS3(file, key);
        }

        return this.uploadLocal(file, key);
    }

    async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
        if (this.provider === 's3') {
            this.logger.warn('S3 signed URLs require AWS SDK — returning key as placeholder');
            return `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${key}`;
        }

        return `/uploads/${key}`;
    }

    private async uploadLocal(file: Buffer, key: string): Promise<string> {
        const filePath = path.join(this.localDir, key);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file);
        this.logger.log(`File stored locally: ${key}`);
        return `/uploads/${key}`;
    }

    private async uploadToS3(file: Buffer, key: string): Promise<string> {
        this.logger.warn('S3 upload requires @aws-sdk/client-s3 — storing locally as fallback');
        return this.uploadLocal(file, key);
    }
}
