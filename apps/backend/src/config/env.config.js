// const atomEnvironment = (process.env.ATOM_ENV || "UAT").toUpperCase();

// export const envConfig = {
//   PORT: process.env.PORT,

//   DATABASE_URL: process.env.DATABASE_URL,

//   ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
//   ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN,
//   REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
//   REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN,

//   ATOM_ENV: atomEnvironment,
//   ATOM_MERCHANT_ID: process.env.ATOM_MERCHANT_ID,
//   ATOM_PASSWORD: process.env.ATOM_PASSWORD,
//   ATOM_PRODUCT_CODE: process.env.ATOM_PRODUCT_CODE,
//   ATOM_REQUEST_ENCRYPTION_KEY: process.env.ATOM_REQUEST_ENCRYPTION_KEY,
//   ATOM_RESPONSE_DECRYPTION_KEY: process.env.ATOM_RESPONSE_DECRYPTION_KEY,
//   ATOM_RESPONSE_HASH_KEY: process.env.ATOM_RESPONSE_HASH_KEY,

//   // Jodhpur credentials
//   ATOM_JODHPUR_MERCHANT_ID: process.env.ATOM_JODHPUR_MERCHANT_ID,
//   ATOM_JODHPUR_PASSWORD: process.env.ATOM_JODHPUR_PASSWORD,
//   ATOM_JODHPUR_PRODUCT_CODE: process.env.ATOM_JODHPUR_PRODUCT_CODE,
//   ATOM_JODHPUR_REQUEST_ENCRYPTION_KEY: process.env.ATOM_JODHPUR_REQUEST_ENCRYPTION_KEY,
//   ATOM_JODHPUR_RESPONSE_DECRYPTION_KEY: process.env.ATOM_JODHPUR_RESPONSE_DECRYPTION_KEY,
//   ATOM_JODHPUR_RESPONSE_HASH_KEY: process.env.ATOM_JODHPUR_RESPONSE_HASH_KEY,

//   ATOM_AUTH_URL:
//     process.env.ATOM_AUTH_URL || (atomEnvironment === "PROD"
//       ? "https://payment1.atomtech.in/ots/aipay/auth"
//       : "https://paynetzuat.atomtech.in/ots/aipay/auth"),

//   ATOM_CHECKOUT_JS_URL: process.env.ATOM_CHECKOUT_JS_URL ||
//     (atomEnvironment === "PROD"
//       ? "https://psa.atomtech.in/staticdata/ots/js/atomcheckout.js"
//       : "https://pgtest.atomtech.in/staticdata/ots/js/atomcheckout.js"),

//   BASE_URL: process.env.BASE_URL,
//   FRONTEND_URL: process.env.FRONTEND_URL,

//   QR_SECRET: process.env.QR_SECRET,
// };

const atomEnvironment = (process.env.ATOM_ENV || "PROD").toUpperCase();

export const envConfig = {
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,

  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN,

  ATOM_ENV: atomEnvironment,

  // Jaipur credentials
  ATOM_MERCHANT_ID: process.env.ATOM_MERCHANT_ID,
  ATOM_PASSWORD: process.env.ATOM_PASSWORD,
  ATOM_PRODUCT_CODE: process.env.ATOM_PRODUCT_CODE,
  ATOM_REQUEST_ENCRYPTION_KEY: process.env.ATOM_REQUEST_ENCRYPTION_KEY,
  ATOM_RESPONSE_DECRYPTION_KEY: process.env.ATOM_RESPONSE_DECRYPTION_KEY,
  ATOM_RESPONSE_HASH_KEY: process.env.ATOM_RESPONSE_HASH_KEY,

  // Jodhpur credentials
  ATOM_JODHPUR_MERCHANT_ID: process.env.ATOM_JODHPUR_MERCHANT_ID,
  ATOM_JODHPUR_PASSWORD: process.env.ATOM_JODHPUR_PASSWORD,
  ATOM_JODHPUR_PRODUCT_CODE: process.env.ATOM_JODHPUR_PRODUCT_CODE,
  ATOM_JODHPUR_REQUEST_ENCRYPTION_KEY:
    process.env.ATOM_JODHPUR_REQUEST_ENCRYPTION_KEY,
  ATOM_JODHPUR_RESPONSE_DECRYPTION_KEY:
    process.env.ATOM_JODHPUR_RESPONSE_DECRYPTION_KEY,
  ATOM_JODHPUR_RESPONSE_HASH_KEY: process.env.ATOM_JODHPUR_RESPONSE_HASH_KEY,

  // Shared Atom URLs
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

// Dynamic credentials based on location
export const getAtomCredentials = (locationName) => {
  const values = (
    typeof locationName === "object" && locationName !== null
      ? [locationName.name, locationName.city]
      : [locationName]
  )
    .filter(Boolean)
    .map((value) => String(value).trim().toUpperCase());

  const isJaipur = values.some((value) => value.includes("JAIPUR"));
  const isJodhpur = values.some((value) => value.includes("JODHPUR"));

  if (isJaipur) {
    return {
      merchantId: envConfig.ATOM_MERCHANT_ID,
      password: envConfig.ATOM_PASSWORD,
      productCode: envConfig.ATOM_PRODUCT_CODE,
      requestEncryptionKey: envConfig.ATOM_REQUEST_ENCRYPTION_KEY,
      responseDecryptionKey: envConfig.ATOM_RESPONSE_DECRYPTION_KEY,
      responseHashKey: envConfig.ATOM_RESPONSE_HASH_KEY,
    };
  }

  if (isJodhpur) {
    return {
      merchantId: envConfig.ATOM_JODHPUR_MERCHANT_ID,
      password: envConfig.ATOM_JODHPUR_PASSWORD,
      productCode: envConfig.ATOM_JODHPUR_PRODUCT_CODE,
      requestEncryptionKey: envConfig.ATOM_JODHPUR_REQUEST_ENCRYPTION_KEY,
      responseDecryptionKey: envConfig.ATOM_JODHPUR_RESPONSE_DECRYPTION_KEY,
      responseHashKey: envConfig.ATOM_JODHPUR_RESPONSE_HASH_KEY,
    };
  }

  throw new Error(
    `Atom payment not configured for location: ${values.join(", ") || "unknown"}`
  );
};
