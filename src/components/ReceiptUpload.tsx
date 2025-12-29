"use client";

import { useState } from 'react';
import { uploadImageToS3, parseReceiptAction } from '@/server/actions';

interface ReceiptUploadProps {
    onParsed: (data: any, imageUrl: string) => void;
}

export default function ReceiptUpload({ onParsed }: ReceiptUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');

    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Failed to get canvas context"));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Compression failed"));
                }, 'image/jpeg', 0.8);
            };
            img.onerror = (err) => reject(err);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setStatus('Compressing image...');

        try {
            // Step 1: Compress Image
            const compressedBlob = await compressImage(file);

            // Step 2: Convert to base64
            const base64Promise = new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(compressedBlob);
            });
            const base64Data = await base64Promise;

            setStatus('Uploading to S3...');

            // Step 3: Upload to S3
            const uploadResult = await uploadImageToS3(base64Data, file.name);

            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Upload failed');
            }

            const s3Url = uploadResult.url!;
            setStatus('Analyzing receipt with Gemini...');

            // Step 4: Parse receipt with Gemini using S3 URL
            const result = await parseReceiptAction(s3Url);

            if (result.success) {
                onParsed(result.data, s3Url);
            } else {
                console.error("Parse error:", result.error);
                alert(`Error parsing receipt: ${result.error}`);
                setStatus('Failed to analyze.');
            }
        } catch (error) {
            console.error("Upload/Analysis error:", error);
            alert("Error processing receipt.");
            setStatus('Error.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group relative bg-white">
            {uploading ? (
                <div className="flex flex-col items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 font-medium animate-pulse">{status}</p>
                </div>
            ) : (
                <label className="cursor-pointer block">
                    <div className="mb-4 text-5xl group-hover:scale-110 transition-transform duration-200">📸</div>
                    <span className="block text-lg font-semibold text-gray-700 mb-1 group-hover:text-blue-600">
                        Upload Receipt Image
                    </span>
                    <span className="block text-sm text-gray-400">
                        JPG, PNG supported
                    </span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
            )}
        </div>
    );
}

