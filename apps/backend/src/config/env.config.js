export const envConfig = {
  PORT: process.env.PORT,

  DATABASE_URL: process.env.DATABASE_URL,

  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN,

  // EASEBUZZ_KEY: process.env.EASEBUZZ_KEY,
  // EASEBUZZ_SALT: process.env.EASEBUZZ_SALT,

  ATOM_ENV: process.env.ATOM_ENV || "UAT",
  ATOM_MERCHANT_ID: process.env.ATOM_MERCHANT_ID,
  ATOM_PASSWORD: process.env.ATOM_PASSWORD,
  ATOM_PRODUCT_CODE: process.env.ATOM_PRODUCT_CODE,
  ATOM_REQUEST_ENCRYPTION_KEY: process.env.ATOM_REQUEST_ENCRYPTION_KEY,
  ATOM_RESPONSE_DECRYPTION_KEY: process.env.ATOM_RESPONSE_DECRYPTION_KEY,
  ATOM_REQUEST_HASH_KEY: process.env.ATOM_REQUEST_HASH_KEY,
  ATOM_RESPONSE_HASH_KEY: process.env.ATOM_RESPONSE_HASH_KEY,
  ATOM_AUTH_URL: process.env.ATOM_AUTH_URL || "https://paynetzuat.atomtech.in/ots/aipay/auth",
  ATOM_CHECKOUT_JS_URL: process.env.ATOM_CHECKOUT_JS_URL || "https://pgtest.atomtech.in/staticdata/ots/js/atomcheckout.js",

  BASE_URL: process.env.BASE_URL,

  QR_SECRET: process.env.QR_SECRET,
};
