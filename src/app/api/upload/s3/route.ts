/**
 * API route handler for uploading images to S3
 * POST /api/upload/s3
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { uploadToS3AndGetPresignedUrl } from '@/lib/s3';
import { isValidBase64Image, isValidFileName } from '@/lib/validation';

interface UploadRequest {
    base64Image: string;
    fileName: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: UploadRequest = await request.json();
        const { base64Image, fileName } = body;

        // Validate inputs
        const imageValidation = isValidBase64Image(base64Image);
        if (!imageValidation.valid) {
            return errorResponse(
                imageValidation.error || 'Invalid image data',
                ErrorCodes.BAD_REQUEST
            );
        }

        if (!isValidFileName(fileName)) {
            return errorResponse('Invalid file name', ErrorCodes.BAD_REQUEST);
        }

        console.log('Uploading image to S3...');

        // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        const cleanBase64 = base64Image.includes('base64,')
            ? base64Image.split('base64,')[1]
            : base64Image;

        // Convert base64 to buffer
        const buffer = Buffer.from(cleanBase64, 'base64');

        // Generate unique key for S3
        const key = `receipts/${Date.now()}_${fileName}`;

        // Upload to S3 and get presigned URL
        console.time('S3 Upload');
        const presignedUrl = await uploadToS3AndGetPresignedUrl(buffer, key, 'image/jpeg');
        console.timeEnd('S3 Upload');

        console.log('Image uploaded to S3 successfully');

        return successResponse({ url: presignedUrl, key });

    } catch (error: unknown) {
        console.error('Error uploading to S3:', error);
        const message = error instanceof Error ? error.message : 'Upload failed';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
