/**
 * API route handler for parsing receipts with Gemini AI
 * POST /api/receipts/parse
 * Requires: Authentication
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { geminiClient } from '@/lib/gemini';
import { isValidImageUrl } from '@/lib/validation';
import { verifyAuthToken } from '@/lib/auth';
import { logger, generateRequestId } from '@/lib/logger';

interface ParseRequest {
    imageUrl: string;
}

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();

    try {
        // Authenticate the caller
        const authResult = await verifyAuthToken(request);
        if (!authResult) {
            return errorResponse('Authentication required', ErrorCodes.UNAUTHORIZED);
        }

        const body: ParseRequest = await request.json();
        const { imageUrl } = body;

        // Validate image URL is from allowed domain
        if (!isValidImageUrl(imageUrl)) {
            return errorResponse(
                'Invalid image URL - must be from allowed domain',
                ErrorCodes.BAD_REQUEST
            );
        }

        logger.info('Analyzing receipt with Gemini', { requestId, userId: authResult.uid });

        // Prepare Gemini request
        const startTime = Date.now();
        const prompt = `
      Analyze this receipt image and extract the following:
      1. List of items purchased (name, price, quantity).
      2. Taxes, tips, service fees, and any other additional charges - include these as separate items in the items list.
      3. Total amount of the receipt.
      4. Date of the receipt.
      5. Merchant/Store name.
      6. Categorize the expense based on the merchant and items. Use one of these categories:
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

      IMPORTANT: Include taxes (HST, GST, PST, VAT, Sales Tax, etc.), tips, service charges, and any other fees as separate items in the items array. For example:
      { "name": "HST (13%)", "price": 5.20, "quantity": 1 }
      { "name": "Tip", "price": 10.00, "quantity": 1 }

      Return ONLY a valid JSON object with this structure:
      {
        "merchant": "Store Name",
        "date": "YYYY-MM-DD",
        "total": 123.45,
        "category": "Grocery",
        "items": [
          { "name": "Item 1", "price": 10.00, "quantity": 1 },
          { "name": "HST (13%)", "price": 1.30, "quantity": 1 }
        ]
      }
      Do not include any Markdown formatting (no \`\`\`json). Just the raw JSON string.
    `;

        // Generate Content using file URL instead of inline base64
        logger.debug('Sending request to Gemini model', { requestId });
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
        const duration = Date.now() - startTime;

        // TS confirms it is a getter.
        const text = response.text;
        logger.debug('Gemini response received', {
            requestId,
            responseLength: text?.length,
            durationMs: duration
        });

        if (typeof text !== 'string') {
            logger.warn('Unexpected response type from Gemini', {
                requestId,
                responseType: typeof text
            });
        }

        // Parse JSON
        // Clean up markdown code blocks if Gemini ignores instruction
        const cleanedText = text
            ? text.replace(/```json/g, '').replace(/```/g, '').trim()
            : '{}';
        const data = JSON.parse(cleanedText);

        logger.info('Receipt parsed successfully', {
            requestId,
            userId: authResult.uid,
            merchant: data.merchant,
            category: data.category,
            durationMs: duration
        });

        return successResponse({ data });

    } catch (error: unknown) {
        logger.error('Error parsing receipt', error, { requestId });
        const message = error instanceof Error ? error.message : 'Parse failed';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}

