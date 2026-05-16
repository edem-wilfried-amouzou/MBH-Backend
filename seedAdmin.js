require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/agrilogix';

async function seedAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connecté à la base de données pour le seeding...');

    const adminEmail = 'admin@agrilogix.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('L\'administrateur existe déjà.');
      // Ensure he is system admin
      existingAdmin.isSystemAdmin = true;
      await existingAdmin.save();
      console.log('Privilèges admin confirmés.');
    } else {
      const hashedPassword = await bcrypt.hash('Admin@2026!', 10);
      const newAdmin = new User({
        name: 'System Admin',
        email: adminEmail,
        password: hashedPassword,
        isSystemAdmin: true,
        emailVerified: true,
        acceptedTerms: true,
        acceptedTermsAt: new Date()
      });

      await newAdmin.save();
      console.log('Nouvel administrateur créé avec succès !');
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
