const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');  // Импортируем функцию для генерации UUID
const CommandStats = require('./CommandStats'); // Подключаем модель

mongoose.connect('mongodb+srv://brawlmisha9a9a9a9a:dynaset1805@cluster0.ueoldut.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');

    // Находим всех пользователей без UUID и добавляем им UUID
    CommandStats.find({ uuid: { $exists: false } })
      .then(users => {
        users.forEach(user => {
          const newUuid = uuidv4(); // Генерируем новый уникальный UUID
          user.uuid = newUuid; // Присваиваем UUID пользователю
          
          user.save()
            .then(() => console.log(`UUID added for user ${user.username}`))
            .catch(err => console.error(`Error saving user ${user.username}:`, err));
        });
      })
      .catch(err => console.error('Error fetching users:', err));
  })
  .catch(err => console.error('Error connecting to MongoDB:', err));
