const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();
const API_KEY = process.env.GNEWS_API_KEY;





router.get('/military-news', async (req, res) => {
  try {
    const response = await axios.get(`https://gnews.io/api/v4/search?q=military&lang=en&max=10&token=${API_KEY}`);
    res.json(response.data.articles);
  } catch (error) {
    console.error('Error fetching military news:', error);
    res.status(500).json({ error: 'Failed to fetch military news' });
  }
});

module.exports = router;
