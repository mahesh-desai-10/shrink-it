const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const shortid = require('shortid');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/urlShortener', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// URL Schema
const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true
  },
  shortCode: {
    type: String,
    required: true,
    default: shortid.generate
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // URLs expire after 24 hours
  },
  clicks: {
    type: Number,
    default: 0
  }
});

const URL = mongoose.model('URL', urlSchema);

// API endpoint to create short URL
app.post('/api/shorten', async (req, res) => {
  const { originalUrl } = req.body;
  
  if (!originalUrl) {
    return res.status(400).json({ error: 'Please provide a URL' });
  }
  
  try {
    // Check if URL already exists in database
    let url = await URL.findOne({ originalUrl });
    
    if (url) {
      return res.json(url);
    }
    
    // Create new short URL
    url = new URL({
      originalUrl,
      shortCode: shortid.generate()
    });
    
    await url.save();
    return res.json(url);
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to get all URLs (for history)
app.get('/api/urls', async (req, res) => {
  try {
    const urls = await URL.find().sort({ createdAt: -1 });
    return res.json(urls);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Redirect endpoint
app.get('/:shortCode', async (req, res) => {
  try {
    const url = await URL.findOne({ shortCode: req.params.shortCode });
    
    if (!url) {
      return res.status(404).json({ error: 'URL not found' });
    }
    
    // Increment click count
    url.clicks++;
    await url.save();
    
    return res.redirect(url.originalUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});