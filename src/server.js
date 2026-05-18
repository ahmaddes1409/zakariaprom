const express = require('express');
const path = require('path');
const { fetchAndParseProducts, getCategories, getProductsByCategory, searchProducts, getProductById } = require('./dataService');
const { uiTranslations } = require('./translations');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 24, sort, lang = 'tr' } = req.query;
    let products = await fetchAndParseProducts();

    // Filter by category
    if (category && category !== 'all') {
      products = getProductsByCategory(products, category);
    }

    // Search
    if (search) {
      products = searchProducts(products, search, lang);
    }

    // Sort
    if (sort === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === 'name') {
      products.sort((a, b) => a.name.tr.localeCompare(b.name.tr));
    }

    // Pagination
    const total = products.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedProducts = products.slice(offset, offset + parseInt(limit));

    res.json({
      products: paginatedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const products = await fetchAndParseProducts();
    const categories = getCategories(products);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/product/:id', async (req, res) => {
  try {
    const products = await fetchAndParseProducts();
    const product = getProductById(products, req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.get('/api/translations/:lang', (req, res) => {
  const lang = req.params.lang;
  if (uiTranslations[lang]) {
    res.json(uiTranslations[lang]);
  } else {
    res.status(404).json({ error: 'Language not found' });
  }
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Zakaria Prom server running on port ${PORT}`);
});
