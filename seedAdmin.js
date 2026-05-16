require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/agrilogix';

async function seedAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connecté à la base de données pour le seeding (Admin Model)...');

    const adminEmail = 'admin@agrilogix.com';
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('L\'administrateur existe déjà dans la collection Admin.');
    } else {
      const hashedPassword = await bcrypt.hash('Admin@2026!', 10);
      const newAdmin = new Admin({
        name: 'System Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'SuperAdmin'
      });

      await newAdmin.save();
      console.log('Nouvel administrateur créé avec succès dans la collection Admin !');
      console.log('Email: admin@agrilogix.com');
      console.log('Password: Admin@2026!');
    }

    await mongoose.connection.close();
    console.log('Déconnexion de la base de données.');
  } catch (err) {
    console.error('Erreur lors du seeding:', err);
    process.exit(1);
  }
}

seedAdmin();
