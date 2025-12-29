import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    console.warn("AWS S3 environment variables are not fully configured.");
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
 * Upload a file to S3 and return a presigned URL for reading
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
    // Upload the file
    const putCommand = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });

    await s3Client.send(putCommand);

    // Generate presigned URL for reading (valid for 1 hour)
    const getCommand = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, getCommand, {
        expiresIn: 3600, // 1 hour
    });

    return presignedUrl;
}
