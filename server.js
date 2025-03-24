const express = require("express");
const scrapeAmazon = require("./scraper"); // Import the function
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
app.get("/scrape", async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "Missing URL parameter" });
    }

    try {
        const data = await scrapeAmazon(url);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Scraping failed", details: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
