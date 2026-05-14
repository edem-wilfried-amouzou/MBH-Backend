const paydunya = require('paydunya');

// On initialise Setup et Store de manière globale ou par requête
// Ici on peut les créer une fois si les clés ne changent pas.

const createInvoice = async (amount, description, callbackUrl, returnUrl) => {
  const setup = new paydunya.Setup({
    masterKey: process.env.PAYDUNYA_MASTER_KEY,
    privateKey: process.env.PAYDUNYA_PRIVATE_KEY,
    token: process.env.PAYDUNYA_TOKEN,
    mode: process.env.PAYDUNYA_MODE || 'test'
  });

  const store = new paydunya.Store({
    name: 'AgriLogix',
    tagline: 'Transparence financière agricole',
    phoneNumber: '0022890000000',
    postalAddress: 'Lomé, Togo',
    logoURL: 'https://agrixlogix.vercel.app/logo.png',
    returnURL: returnUrl,
    callbackURL: callbackUrl
  });

  const invoice = new paydunya.CheckoutInvoice(setup, store);
  invoice.totalAmount = amount;
  invoice.description = description;
  invoice.addCustomData('description', description);
  
  try {
    const result = await invoice.create();
    // invoice.create() retourne une promesse qui résout après l'appel API
    // Mais selon le code de la lib, elle fait resolve(self.confirm())?
    // Non, elle met à jour self.token et self.url
    return {
      token: invoice.token,
      url: invoice.url
    };
  } catch (err) {
    console.error('PayDunya Create Error:', err.data || err.message);
    throw err;
  }
};

const verifyPayment = async (token) => {
  const setup = new paydunya.Setup({
    masterKey: process.env.PAYDUNYA_MASTER_KEY,
    privateKey: process.env.PAYDUNYA_PRIVATE_KEY,
    token: process.env.PAYDUNYA_TOKEN,
    mode: process.env.PAYDUNYA_MODE || 'test'
  });

  const store = new paydunya.Store({
    name: 'AgriLogix'
  });

  const invoice = new paydunya.CheckoutInvoice(setup, store);
  try {
    await invoice.confirm(token);
    return invoice;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  createInvoice,
  verifyPayment
};
