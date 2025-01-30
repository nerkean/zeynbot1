const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true }, 
  items: [{
    itemId: { type: String, required: true }, 
    itemName: { type: String, required: true }, 
    quantity: { type: Number, default: 1 },
  }]
  
});

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
