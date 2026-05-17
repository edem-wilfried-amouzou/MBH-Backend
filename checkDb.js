require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const MONGO_URI = process.env.MONGO_URI ? process.env.MONGO_URI.replace(/'/g, '') : 'mongodb://localhost:27017/agrilogix';

async function checkDb() {
  try {
    console.log('Connecting to:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections list:');
    collections.forEach(c => console.log(' -', c.name));

    const adminCount = await Admin.countDocuments();
    console.log('Total Admins in collection:', adminCount);

    if (adminCount > 0) {
      const admins = await Admin.find();
      admins.forEach(a => console.log('Found Admin:', a.email, 'Role:', a.role));
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkDb();
