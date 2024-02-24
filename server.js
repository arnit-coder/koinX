
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define the Crypto schema
const cryptoSchema = new mongoose.Schema({
  id: String,
  name: String,
});

const Crypto = mongoose.model('Crypto', cryptoSchema);

// Background job to update cryptos every hour
const updateCryptos = async () => {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd'
    );
    response.data.forEach(async (crypto) => {
      const existingCrypto = await Crypto.findOne({ id: crypto.id });
      if (!existingCrypto) {
        await new Crypto({ id: crypto.id, name: crypto.name }).save();
      }
    });
  } catch (error) {
    console.error('Error updating cryptos:', error.message);
  }
};

// Update cryptos on startup and every hour
updateCryptos();
setInterval(updateCryptos, 1000 * 60 * 60);

// API to get list of all cryptocurrencies
app.get('/api/cryptos', async (req, res) => {
  try {
    const cryptos = await Crypto.find({});
    res.json(cryptos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API to get list of companies holding a particular cryptocurrency
app.get('/api/companies/:coin_id', async (req, res) => {
  try {
    const { coin_id } = req.params;
    const response = await axios.get(`https://api.coingecko.com/api/v3/companies/public_treasury/${coin_id}`);
    res.json(response.data);
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
});

//conversion
app.post('/api/convert', async (req, res) => {
    try {
      const { fromCurrency, toCurrency, date } = req.body;
      const fromId = (await Crypto.findOne({ name: fromCurrency.toLowerCase() })).id;
      const toId = (await Crypto.findOne({ name: toCurrency.toLowerCase() })).id;
  
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${fromId}/market_chart/range?vs_currency=${toId}&from=${date}&to=${date}`
      );
  
      res.json({
        price: response.data.prices[0][1],
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));