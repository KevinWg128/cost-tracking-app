/**
 * API route handler for parsing receipts with Gemini AI
 * POST /api/receipts/parse
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { geminiClient } from '@/lib/gemini';
import { isValidImageUrl } from '@/lib/validation';

interface ParseRequest {
    imageUrl: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: ParseRequest = await request.json();
        const { imageUrl } = body;

        // Validate image URL is from allowed domain
        if (!isValidImageUrl(imageUrl)) {
            return errorResponse(
                'Invalid image URL - must be from allowed domain',
                ErrorCodes.BAD_REQUEST
            );
        }

        console.log('Analyzing receipt with Gemini using S3 URL...');

        // Prepare Gemini request
        console.time('Gemini Request');
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
        console.log('Using model with image URL');
        const response = await geminiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            fileData: {
                                fileUri: imageUrl,
                                mimeType: 'image/jpeg',
                            },
                        },
                        { text: prompt },
                    ],
                },
            ],
        });
        console.timeEnd('Gemini Request');

        // TS confirms it is a getter.
        const text = response.text;
        console.log('Gemini Raw Response length:', text?.length);

        if (typeof text !== 'string') {
            console.log('Warning: response.text is not a string, it is:', typeof text);
        }

        // Parse JSON
        // Clean up markdown code blocks if Gemini ignores instruction
        const cleanedText = text
            ? text.replace(/```json/g, '').replace(/```/g, '').trim()
            : '{}';
        const data = JSON.parse(cleanedText);

        return successResponse({ data });

    } catch (error: unknown) {
        console.error('Error parsing receipt:', error);
        const message = error instanceof Error ? error.message : 'Parse failed';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
