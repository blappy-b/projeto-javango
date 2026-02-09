import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Inicializa o cliente com o Access Token
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN 
});

// Exporta as instâncias para usar nas Actions e Webhooks
export const mpPreference = new Preference(client);
export const mpPayment = new Payment(client);