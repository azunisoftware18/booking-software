const atomEnvironment = (process.env.ATOM_ENV || "UAT").toUpperCase();

export const envConfig = {
  PORT: process.env.PORT,

  DATABASE_URL: process.env.DATABASE_URL,

  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN,

  ATOM_ENV: atomEnvironment,
  ATOM_MERCHANT_ID: process.env.ATOM_MERCHANT_ID,
  ATOM_PASSWORD: process.env.ATOM_PASSWORD,
  ATOM_PRODUCT_CODE: process.env.ATOM_PRODUCT_CODE,
  ATOM_REQUEST_ENCRYPTION_KEY: process.env.ATOM_REQUEST_ENCRYPTION_KEY,
  ATOM_RESPONSE_DECRYPTION_KEY: process.env.ATOM_RESPONSE_DECRYPTION_KEY,
  ATOM_RESPONSE_HASH_KEY: process.env.ATOM_RESPONSE_HASH_KEY,
  ATOM_AUTH_URL:
    process.env.ATOM_AUTH_URL ||
    (atomEnvironment === "PROD"
      ? "https://payment1.atomtech.in/ots/aipay/auth"
      : "https://paynetzuat.atomtech.in/ots/aipay/auth"),
  ATOM_CHECKOUT_JS_URL:
    process.env.ATOM_CHECKOUT_JS_URL ||
    (atomEnvironment === "PROD"
      ? "https://psa.atomtech.in/staticdata/ots/js/atomcheckout.js"
      : "https://pgtest.atomtech.in/staticdata/ots/js/atomcheckout.js"),

  BASE_URL: process.env.BASE_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,

  QR_SECRET: process.env.QR_SECRET,
};
