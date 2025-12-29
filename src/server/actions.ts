"use server";

import { geminiClient } from "@/lib/gemini";
import { uploadToS3AndGetPresignedUrl } from "@/lib/s3";
import { isValidBase64Image, isValidFileName, isValidImageUrl } from "@/lib/validation";

/**
 * Upload image to S3 and return the presigned URL
 */
export async function uploadImageToS3(base64Image: string, fileName: string) {
    // Validate inputs
    const imageValidation = isValidBase64Image(base64Image);
    if (!imageValidation.valid) {
        return { success: false, error: imageValidation.error || 'Invalid image data' };
    }

    if (!isValidFileName(fileName)) {
        return { success: false, error: 'Invalid file name' };
    }

    try {
        console.log("Uploading image to S3...");

        // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        const cleanBase64 = base64Image.includes('base64,')
            ? base64Image.split('base64,')[1]
            : base64Image;

        // Convert base64 to buffer
        const buffer = Buffer.from(cleanBase64, 'base64');

        // Generate unique key for S3
        const key = `receipts/${Date.now()}_${fileName}`;

        // Upload to S3 and get presigned URL
        console.time("S3 Upload");
        const presignedUrl = await uploadToS3AndGetPresignedUrl(buffer, key, "image/jpeg");
        console.timeEnd("S3 Upload");

        console.log("Image uploaded to S3 successfully");
        return { success: true, url: presignedUrl, key };
    } catch (error: any) {
        console.error("Error uploading to S3:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Parse receipt using Gemini with image URL from S3
 */
export async function parseReceiptAction(imageUrl: string) {
    // Validate image URL is from allowed domain
    if (!isValidImageUrl(imageUrl)) {
        return { success: false, error: 'Invalid image URL - must be from allowed domain' };
    }

    try {
        console.log("Analyzing receipt with Gemini using S3 URL...");

        // Prepare Gemini request
        console.time("Gemini Request");
        const prompt = `
      Analyze this receipt image and extract the following:
      1. List of items purchased (name, price, quantity).
      2. Total amount of the receipt.
      3. Date of the receipt.
      4. Merchant/Store name.
      5. Categorize the expense based on the merchant and items. Use one of these categories:
         - Grocery (supermarkets, food stores)
         - Dining (restaurants, cafes, fast food)
         - Travel (flights, hotels, car rentals, gas stations)
         - Entertainment (movies, concerts, games)
         - Shopping (clothing, electronics, general retail)
         - Utilities (hydro, electricity, water, gas bills)
         - Internet (internet service, phone bills)
         - Healthcare (pharmacy, medical expenses)
         - Transportation (transit, taxi, ride-sharing)
         - Other (anything that doesn't fit above)

      Return ONLY a valid JSON object with this structure:
      {
        "merchant": "Store Name",
        "date": "YYYY-MM-DD",
        "total": 123.45,
        "category": "Grocery",
        "items": [
          { "name": "Item 1", "price": 10.00, "quantity": 1 }
        ]
      }
      Do not include any Markdown formatting (no \`\`\`json). Just the raw JSON string.
    `;

        // Generate Content using file URL instead of inline base64
        console.log("Using model with image URL");
        console.log("Gemini API Key: ", process.env.GEMINI_API_KEY);
        const response = await geminiClient.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            fileData: {
                                fileUri: imageUrl,
                                mimeType: "image/jpeg"
                            }
                        },
                        { text: prompt }
                    ]
                }
            ]
        });
        console.timeEnd("Gemini Request");

        // TS confirms it is a getter.
        const text = response.text;
        console.log("Gemini Raw Response length:", text?.length);

        if (typeof text !== 'string') {
            console.log("Warning: response.text is not a string, it is:", typeof text);
        }

        // Parse JSON
        // Clean up markdown code blocks if Gemini ignores instruction
        const cleanedText = text ? text.replace(/```json/g, "").replace(/```/g, "").trim() : "{}";
        const data = JSON.parse(cleanedText);

        return { success: true, data };

    } catch (error: any) {
        console.error("Error parsing receipt:", error);
        return { success: false, error: error.message };
    }
}
