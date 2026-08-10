import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, InternalServerErrorException } from "@nestjs/common";

/**
 * Thin wrapper over Cloudflare R2 (S3-compatible). Bytes never touch the API:
 * the browser uploads with a pre-signed PUT and downloads with a pre-signed
 * GET. The API only signs URLs and deletes objects.
 *
 * Configured via env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * R2_BUCKET. When unset, `isConfigured` is false and signing throws a clear
 * error (so the rest of the app still boots without receipts configured).
 */
@Injectable()
export class R2Service {
  private readonly client: S3Client | null;
  private readonly bucket: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
    this.bucket = process.env.R2_BUCKET?.trim() ?? "";

    if (accountId && accessKeyId && secretAccessKey && this.bucket) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.client = null;
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new InternalServerErrorException(
        "Receipt storage (Cloudflare R2) is not configured on the server.",
      );
    }
    return this.client;
  }

  /** Pre-signed PUT URL the browser uploads to directly. */
  presignPut(
    key: string,
    contentType: string,
    expiresIn = 300,
  ): Promise<string> {
    return getSignedUrl(
      this.requireClient(),
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn },
    );
  }

  /** Short-lived pre-signed GET URL for viewing/downloading. */
  presignGet(key: string, expiresIn = 300): Promise<string> {
    return getSignedUrl(
      this.requireClient(),
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.requireClient().send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /** Lists every object under `prefix`, following pagination to the end. */
  async listObjects(prefix: string): Promise<{ key: string; size: number }[]> {
    const client = this.requireClient();
    const objects: { key: string; size: number }[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of response.Contents ?? []) {
        if (obj.Key) objects.push({ key: obj.Key, size: obj.Size ?? 0 });
      }
      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return objects;
  }
}
