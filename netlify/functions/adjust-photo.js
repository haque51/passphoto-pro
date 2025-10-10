// netlify/functions/adjust-photo.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Handle CORS preflight
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

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { imageBase64, country, docType } = JSON.parse(event.body);

    // Validate input
    if (!imageBase64 || !country || !docType) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing required fields: imageBase64, country, docType' })
      };
    }

    // Define background requirements
    const backgroundMap = {
      'US': { passport: 'plain white', visa: 'plain white' },
      'UK': { passport: 'plain light grey' },
      'Schengen': { visa: 'plain light grey' },
      'Canada': { passport: 'plain white', visa: 'plain white' },
      'Australia': { passport: 'plain light grey', visa: 'plain white' },
      'India': { passport: 'plain white', visa: 'plain white' }
      // Add more as needed
    };

    const bgDescription = backgroundMap[country]?.[docType] || 'plain white';

    // Call Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const prompt = `You are an expert passport photo editor. Transform this image into a compliant passport photo:

CRITICAL REQUIREMENTS:
1. The person MUST be looking directly at the camera with eyes open
2. Expression MUST be neutral with mouth closed
3. Replace the background with a ${bgDescription} background (perfectly uniform, no shadows)
4. Ensure bright, even lighting on the subject's face
5. Do NOT crop the image - maintain full dimensions

Make these adjustments while keeping the person's natural appearance.`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64
              }
            }
          ]
        }],
        generationConfig: {
          responseModalities: ['IMAGE']
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', response.status, errorText);
      
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'AI service error',
          details: response.status === 429 
            ? 'Service is busy. Please wait a moment and try again.' 
            : 'Failed to process image. Please try again.'
        })
      };
    }

    const result = await response.json();
    const adjustedImageBase64 = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

    if (!adjustedImageBase64) {
      console.error('No image data in response:', JSON.stringify(result));
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Failed to process image - no data returned' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        adjustedImageBase64,
        success: true 
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
