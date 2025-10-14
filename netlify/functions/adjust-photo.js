// netlify/functions/adjust-photo.js
// WORKING VERSION - Uses Gemini 2.5 Flash Image for actual photo transformation

exports.handler = async (event) => {
    // Handle CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { imageBase64, country, docType } = JSON.parse(event.body);

        if (!imageBase64) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'No image data provided' })
            };
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY not configured');
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }

        // Determine background based on country
        const backgroundDescription = country === 'US' ? 'pure white' : 'light grey';

        // Create comprehensive prompt for passport photo transformation
        const prompt = `Transform this photo into a professional passport photo with these exact requirements:

1. BACKGROUND: Replace the entire background with a ${backgroundDescription} background that is completely uniform with no shadows, gradients, or variations.

2. POSE & EXPRESSION: 
   - Person must be looking directly at the camera
   - Head should be straight and centered
   - Neutral expression with mouth closed
   - Eyes fully visible and open

3. LIGHTING: Adjust lighting to be bright and even across the face, like professional studio lighting with no harsh shadows.

4. QUALITY: Maintain high resolution and sharp details. Do not crop or resize the image.

Generate a professional passport-compliant photo.`;

        console.log('Attempting image generation with Gemini 2.5 Flash Image...');

        // Use Gemini 2.5 Flash Image model (the one you have!)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    {
                        text: prompt
                    },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: imageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.4,
                topK: 64,
                topP: 0.95,
                maxOutputTokens: 8192
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', response.status, errorText);
            
            if (response.status === 429) {
                return {
                    statusCode: 429,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ 
                        error: 'API quota exceeded. Please try again in a few moments.' 
                    })
                };
            }

            return {
                statusCode: response.status,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'AI service error',
                    details: errorText.substring(0, 200)
                })
            };
        }

        const result = await response.json();
        console.log('API Response received');

        // Extract generated image from response
        // Check for image in multiple possible locations
        let base64Data = null;
        
        // Method 1: Check inline_data
        const imagePart = result?.candidates?.[0]?.content?.parts?.find(
            p => p.inline_data || p.inlineData
        );
        
        if (imagePart) {
            base64Data = imagePart.inline_data?.data || imagePart.inlineData?.data;
        }

        // Method 2: Check if image is in text response (some models return base64 in text)
        if (!base64Data) {
            const textPart = result?.candidates?.[0]?.content?.parts?.find(p => p.text);
            if (textPart?.text) {
                // Try to extract base64 from text
                const base64Match = textPart.text.match(/^[A-Za-z0-9+/]+=*$/);
                if (base64Match) {
                    base64Data = textPart.text;
                }
            }
        }

        if (!base64Data) {
            console.error('No image in response. Full response:', JSON.stringify(result).substring(0, 500));
            
            // Return helpful error
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'Image generation not available',
                    message: 'The AI model did not generate an image. This feature may not be available with your current API configuration. You can still use manual adjustments.',
                    modelUsed: 'gemini-2.5-flash-image'
                })
            };
        }

        console.log('Successfully generated image, base64 length:', base64Data.length);

        // Return the generated image
        return {
            statusCode: 200,
            headers: { 
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true,
                adjustedImageBase64: base64Data,
                modelUsed: 'gemini-2.5-flash-image'
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
