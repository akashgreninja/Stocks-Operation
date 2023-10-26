const express = require("express");
const router = express.Router();
const axios = require("axios");
const winston = require("winston");

require("dotenv").config();

const buyOrders = [];
const sellOrders = [];

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "trading-app.log" })],
});

const TRANSACTION_COST = 10;
const MINIMUM_BALANCE = 1000;

async function fetchStockData(symbol) {
  //api key loaded from the env
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${apiKey}`,
      { timeout: 5000 }
    );
    return response.data;
  } catch (error) {
    logger.error(`Error fetching stock data: ${error.message}`);
    return null;
  }
}

// Function to execute a trade (to be implemented)
function executeTrade(buyOrder, sellOrder, marketData) {
  // Check if the buyer has enough balance to cover the transaction cost
  if (buyOrder.price * buyOrder.quantity + TRANSACTION_COST > MINIMUM_BALANCE) {
    logger.error("Insufficient funds to cover transaction cost.");
    return;
  }

  // Check checkers
  const region = sellOrder.region;
  const market = marketData.markets.find(
    (m) => m.region === region && m.market_type === "Equity"
  );
  if (!market || market.current_status !== "open") {
    logger.error(`Market is closed for region ${region}.`);
    return;
  }

  // Execute the trade
  buyOrder.quantity--;
  sellOrder.quantity--;

  const transactionCost = TRANSACTION_COST;
  logger.info(`Trade executed: Buy ${buyOrder} with Sell ${sellOrder}`);
  logger.info(`Transaction cost: ${transactionCost}`);
}

function matchOrders(stockData) {
  for (const symbol in stockData) {
    const stock = stockData[symbol];
    for (const buyOrder of buyOrders) {
      if (buyOrder.symbol !== symbol) {
        continue;
      }
      for (const sellOrder of sellOrders) {
        if (sellOrder.symbol !== symbol) {
          continue;
        }
        if (buyOrder.price >= sellOrder.price) {
          try {
            executeTrade(buyOrder, sellOrder);
          } catch (error) {
            logger.error(`Error executing trade: ${error.message}`);
          }
        }
      }
    }
  }
}

// Route to add a buy order
router.post("/buy", userAuth, (req, res) => {
    const { symbol, price, quantity } = req.body;
    buyOrders.push({ symbol, price, quantity });
    res.send("Buy order added successfully.");
  });
  
  // Route to add a sell order
  router.post("/sell", userAuth, (req, res) => {
    const { symbol, price, quantity, region } = req.body;
    sellOrders.push({ symbol, price, quantity, region });
    res.send("Sell order added successfully.");
  });

// Route to get all buy orders
router.get("/buy", (req, res) => {
  res.send(buyOrders);
});

// Route to get all sell orders
router.get("/sell", (req, res) => {
  res.send(sellOrders);
});

// Schedule a cron job to run every 2 hours
cron.schedule("*/10 * * * *", async () => {
  logger.info("Cron job is up");

  // Fetch stock data for multiple symbols
  const symbols = ["TATA", "RELIANCE"];
  const stockData = {};
  for (const symbol of symbols) {
    const data = await fetchStockData(symbol);
    if (data) {
      stockData[symbol] = data;
    }
  }

  // Match orders for each symbol separately
  matchOrders(stockData);
});

// Log a message when the cron job is started
logger.info("Cron job started.");

module.exports = router;