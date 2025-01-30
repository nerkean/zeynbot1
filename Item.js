const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  stock: Number,
  maxStock: Number,
  unique: Boolean,
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item
