// Load environment variables from .env file
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// Supported Gemini flash models (with automatic fallback)
const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite'
];

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static frontend files from the "public" folder
app.use(express.static(path.join(__dirname, '../public')));

// POST /api/generate - Generates HTML, CSS, and JS using Gemini API
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;

    // 1. Validate prompt input
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Please provide a valid website description.' });
    }

    // 2. Validate API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(500).json({
        error: 'Gemini API key is missing. Please add your GEMINI_API_KEY inside the .env file.'
      });
    }

    // 3. Initialize Google GenAI SDK
    const ai = new GoogleGenAI({ apiKey });

    // 4. Construct prompt for Gemini
    const systemPrompt = `
You are an expert web developer.
The user wants you to build a complete, modern, responsive website based on this description:
"${prompt.trim()}"

Generate the HTML, CSS, and JavaScript for this website.
Respond ONLY with a valid JSON object in the following format:
{
  "html": "<body> content only without <html>, <head>, or <body> wrapper tags",
  "css": "modern, responsive CSS styling with clean color palettes, typography, and layout",
  "js": "vanilla JavaScript for interactive features like button clicks, mobile menu toggle, or form submission alert"
}

Important Instructions:
- "html" must be valid HTML elements (like header, nav, hero, sections, cards, footer).
- "css" must make the site look modern and visually attractive (responsive for mobile and desktop).
- "js" must be working vanilla JavaScript.
- Do NOT wrap your output in markdown code blocks or add conversational text. Return strictly pure JSON.
`;

    // 5. Call Gemini API with automatic model fallback
    let response = null;
    let lastError = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        response = await ai.models.generateContent({
          model: model,
          contents: systemPrompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        if (response && response.text) {
          console.log(`Generated website successfully using model: ${model}`);
          break;
        }
      } catch (err) {
        console.warn(`Model ${model} was unavailable, trying next candidate...`);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('All Gemini models were unavailable. Please try again.');
    }

    let rawText = response.text.trim();

    // Remove any accidental markdown backticks (e.g. ```json ... ```)
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
    }

    // 6. Parse JSON result
    let generatedWebsite;
    try {
      generatedWebsite = JSON.parse(rawText);
    } catch (parseError) {
      console.error('Failed to parse Gemini output as JSON:', rawText);
      return res.status(500).json({
        error: 'AI generated code in an unexpected format. Please click Regenerate.'
      });
    }

    // 7. Send the generated code back to frontend
    res.json({
      html: generatedWebsite.html || '',
      css: generatedWebsite.css || '',
      js: generatedWebsite.js || ''
    });

  } catch (error) {
    console.error('Server / Gemini Error:', error);

    // Provide friendly error messages for common issues
    if (error.message && error.message.includes('API key')) {
      return res.status(401).json({ error: 'Invalid Gemini API key. Please check your .env file.' });
    }

    res.status(500).json({
      error: error.message || 'An error occurred while generating the website.'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser.`);
});
