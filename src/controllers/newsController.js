const axios = require("axios");

const getMilitaryNews = async (req, res) => {
  try {
    const response = await axios.get(
      `https://gnews.io/api/v4/search?q=military&lang=en&max=10&token=${process.env.GNEWS_API_KEY}`
    );
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch news", error: error.message });
  }
};

module.exports = { getMilitaryNews };
