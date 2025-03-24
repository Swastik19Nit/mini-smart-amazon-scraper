require("dotenv").config(); 

const puppeteer = require("puppeteer");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
async function scrapeAmazon(productURL) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  try {
    console.log(`🔍 Scraping: ${productURL}`);
    await page.goto(productURL, { waitUntil: "networkidle2" });
    const data = await page.evaluate(() => {
      const getText = (selector) => document.querySelector(selector)?.innerText.trim() || "N/A";
      const getImageLinks = (selector) => [...document.querySelectorAll(selector)].map(img => img.src) || [];
      const getAllReviews = () => [...document.querySelectorAll(".review-text")].map(el => el.innerText.trim()) || [];

      return {
        productName: getText("#productTitle"),
        rating: getText(".a-icon-alt"),
        numRatings: getText("#acrCustomerReviewText"),
        sellingPrice: getText(".a-price-whole") + getText(".a-price-symbol"),
        totalDiscount: getText(".savingsPercentage"),
        bankOffers: getText("#promotions_feature_div"),
        aboutThisItem: getText("#feature-bullets"),
        productInfo: getText("#productDetails_techSpec_section_1"),
        images: getImageLinks("#imgTagWrapperId img, .imageThumbnail img"),
        manufacturerImages: getImageLinks("#aplus img"),
        customerReviews: getAllReviews(),
      };
    });

    await browser.close();

    data.aiReviewSummary = await generateAISummary(data.customerReviews);

    fs.writeFileSync("product.json", JSON.stringify(data, null, 2));
    console.log("✅ Scraping complete! Data saved to product.json");

    return data;
  } catch (error) {
    await browser.close();
    console.error("❌ Scraping failed:", error);
    throw new Error("Scraping failed: " + error.message);
  }
}

async function generateAISummary(reviews) {
  if (!reviews.length) return "No reviews available.";

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-001" });
  const prompt = `
    Summarize the following customer reviews in 2-3 sentences, highlighting key pros and cons:
    ${reviews.join("\n\n")}
  `;

  try {
    const response = await model.generateContent(prompt);
    return response.response.text();
  } catch (error) {
    console.error("❌ Error generating AI summary:", error);
    return "Failed to generate AI summary.";
  }
}

module.exports = scrapeAmazon
