import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    logger.warn("AWS S3 environment variables are not fully configured.");
}

export const s3Client = new S3Client({
    region: region || "us-east-1",
    credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
    },
});

export const S3_BUCKET_NAME = bucketName || "";

/**
 * Upload a file to S3 and return a presigned URL for reading.
 * Includes cleanup logic to delete partial uploads on failure.
 * @param buffer - The file buffer to upload
 * @param key - The S3 object key (path/filename)
 * @param contentType - The MIME type of the file
 * @returns Presigned URL valid for 1 hour
 */
export async function uploadToS3AndGetPresignedUrl(
    buffer: Buffer,
    key: string,
    contentType: string = "image/jpeg"
): Promise<string> {
    let uploadSucceeded = false;

    try {
        // Upload the file
        const putCommand = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });

        await s3Client.send(putCommand);
        uploadSucceeded = true;

        // Generate presigned URL for reading (valid for 1 hour)
        const getCommand = new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
        });

        const presignedUrl = await getSignedUrl(s3Client, getCommand, {
            expiresIn: 3600, // 1 hour
        });

        logger.info("S3 upload successful", { key, contentType });
        return presignedUrl;

    } catch (error) {
        // Clean up partial upload if it succeeded but presigning failed
        if (uploadSucceeded) {
            try {
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: S3_BUCKET_NAME,
                    Key: key,
                });
                await s3Client.send(deleteCommand);
                logger.info("Cleaned up partial S3 upload after failure", { key });
            } catch (cleanupError) {
                logger.error("Failed to clean up partial S3 upload", cleanupError, { key });
            }
        }

        logger.error("S3 upload failed", error, { key, contentType });
        throw error;
    }
}

