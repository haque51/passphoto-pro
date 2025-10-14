// netlify/functions/test-gemini.js
// Simple function to test if your Gemini API key works

exports.handler = async (event) => {
    // Handle CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            body: ''
        };
    }

    try {
        // Get API key from environment variable
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        // Check if key exists
        if (!GEMINI_API_KEY) {
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    success: false,
                    error: 'GEMINI_API_KEY not found in environment variables',
                    message: 'Please add your API key to Netlify environment variables'
                })
            };
        }

        console.log('Testing Gemini API key...');
        console.log('Key starts with:', GEMINI_API_KEY.substring(0, 10) + '...');

        // Test 1: List available models
        const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
        
        const modelsResponse = await fetch(modelsUrl);
        
        if (!modelsResponse.ok) {
            const errorText = await modelsResponse.text();
            console.error('Models API Error:', modelsResponse.status, errorText);
            
            return {
                statusCode: modelsResponse.status,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    success: false,
                    error: 'API key validation failed',
                    status: modelsResponse.status,
                    details: errorText.substring(0, 500),
                    message: modelsResponse.status === 403 
                        ? 'API key is invalid or doesn\'t have permission'
                        : modelsResponse.status === 429
                        ? 'API quota exceeded'
                        : 'API request failed'
                })
            };
        }

        const modelsData = await modelsResponse.json();
        console.log('Available models:', modelsData.models?.length || 0);

        // Test 2: Simple text generation
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const testResponse = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Say 'Hello, API key works!' if you can read this."
                    }]
                }]
            })
        });

        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.error('Generation API Error:', testResponse.status, errorText);
            
            return {
                statusCode: testResponse.status,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    success: false,
                    error: 'Text generation test failed',
                    status: testResponse.status,
                    details: errorText.substring(0, 500)
                })
            };
        }

        const testData = await testResponse.json();
        const responseText = testData.candidates?.[0]?.content?.parts?.[0]?.text;

        console.log('Test generation response:', responseText);

        // Test 3: Check for image generation models
        const imageModels = modelsData.models?.filter(m => 
            m.name?.includes('imagen') || 
            m.supportedGenerationMethods?.includes('generateContent')
        ) || [];

        // Success!
        return {
            statusCode: 200,
            headers: { 
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true,
                message: '✅ Your Gemini API key is working perfectly!',
                keyPrefix: GEMINI_API_KEY.substring(0, 10) + '...',
                tests: {
                    listModels: '✅ Can list models',
                    textGeneration: '✅ Can generate text',
                    responsePreview: responseText?.substring(0, 100)
                },
                availableModels: {
                    total: modelsData.models?.length || 0,
                    imageModels: imageModels.map(m => m.name),
                    textModels: modelsData.models?.slice(0, 5).map(m => m.name) || []
                },
                nextSteps: [
                    '1. Your API key is valid and working',
                    '2. You can now use it for image generation',
                    '3. Ready to implement the adjust-photo function'
                ]
            })
        };

    } catch (error) {
        console.error('Test function error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ 
                success: false,
                error: 'Internal server error',
                message: error.message,
                stack: error.stack?.substring(0, 500)
            })
        };
    }
};
