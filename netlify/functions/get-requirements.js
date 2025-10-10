// netlify/functions/get-requirements.js
const requirementsData = require('../../data/requirements.json');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  const { country, docType } = event.queryStringParameters || {};
  
  try {
    // Return specific requirement
    if (country && docType) {
      const requirement = requirementsData.countries[country]?.[docType];
      
      if (!requirement) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            error: 'Requirements not found',
            message: `No requirements found for ${country} ${docType}`,
            availableCountries: Object.keys(requirementsData.countries)
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600' // Cache 1 hour
        },
        body: JSON.stringify(requirement)
      };
    }
    
    // Return all requirements
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify(requirementsData)
    };
    
  } catch (error) {
    console.error('Error fetching requirements:', error);
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
