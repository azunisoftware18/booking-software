import crypto from "node:crypto";
import axios from "axios";
import { envConfig, getAtomCredentials } from "../config/env.config.js";

const ATOM_LOCATION_NAMES = ["JAIPUR", "JODHPUR", "KOTA"];

const IV = Buffer.from(Array.from({ length: 16 }, (_, index) => index));

const PBKDF2_ITERATIONS = 65536;
const DERIVED_KEY_BITS = 512;

function requireConfig(name, value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ATOM configuration: ${name}`);
  }

  return value.trim();
}

function formatAtomDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return (
    `${values.year}-${values.month}-${values.day} ` +
    `${values.hour}:${values.minute}:${values.second}`
  );
}

function deriveAesKey(password) {
  if (typeof password !== "string" || !password.length) {
    throw new Error("ATOM encryption key is missing");
  }

  // Matches the 512-bit PBKDF2 derivation in the supplied Java sample.
  return crypto.pbkdf2Sync(
    password,
    Buffer.from(password, "utf8"),
    65536,
    64,
    "sha512"
  );
}

function encryptRequest(payload, credentials) {
  const password = requireConfig(
    "ATOM_REQUEST_ENCRYPTION_KEY",
    credentials.requestEncryptionKey
  );

  const key = deriveAesKey(password).subarray(0, 32);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, IV);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);

  return encrypted.toString("hex").toUpperCase();
}

function decryptResponse(encryptedData, credentials) {
  const password = requireConfig(
    "ATOM_RESPONSE_DECRYPTION_KEY",
    credentials.responseDecryptionKey
  );

  if (
    typeof encryptedData !== "string" ||
    !/^(?:[0-9a-f]{2})+$/i.test(encryptedData)
  ) {
    throw new Error("ATOM returned invalid encrypted response data");
  }

  const key = deriveAesKey(password).subarray(0, 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, IV);

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, "hex")),
    decipher.final(),
  ]).toString("utf8");

  try {
    return JSON.parse(decrypted);
  } catch {
    throw new Error("ATOM response is not valid JSON after decryption");
  }
}

function extractEncryptedData(responseBody) {
  if (typeof responseBody === "string") {
    return new URLSearchParams(responseBody).get("encData");
  }

  return responseBody?.encData ?? null;
}

function generateHmacSha512(value, hashKey) {
  return crypto
    .createHmac("sha512", hashKey)
    .update(value, "utf8")
    .digest("hex");
}

class AtomPaymentService {
  static buildAuthPayload({
    txnId,
    amount,
    email,
    phone,
    userId = "",
    custAccNo,
    platformOS,
    credentials,
  }) {
    if (typeof txnId !== "string" || !txnId.trim() || txnId.length > 50) {
      throw new Error("A valid ATOM transaction ID is required");
    }

    if (!email || !phone) {
      throw new Error("Customer email and mobile are required");
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !Number.isSafeInteger(Math.round(numericAmount * 100))
    ) {
      throw new Error("A valid payment amount is required");
    }

    const payDetails = {
      amount: numericAmount.toFixed(2),
      // product: requireConfig("ATOM_PRODUCT_CODE", envConfig.ATOM_PRODUCT_CODE),
      product: requireConfig("ATOM_PRODUCT_CODE", credentials.productCode),
      txnCurrency: "INR",
    };

    if (custAccNo) {
      payDetails.custAccNo = String(custAccNo);
    }

    const custDetails = {
      custEmail: String(email).trim(),
      custMobile: String(phone).trim(),
    };

    if (platformOS) {
      custDetails.platformOS = platformOS;
    }

    return {
      payInstrument: {
        headDetails: {
          version: "OTSv1.1",
          api: "AUTH",
          platform: "FLASH",
        },
        merchDetails: {
          merchId: String(
            requireConfig("ATOM_MERCHANT_ID", credentials.merchantId)
          ),
          userId: String(userId),
          password: requireConfig("ATOM_PASSWORD", credentials.password),
          merchTxnDate: formatAtomDate(),
          merchTxnId: txnId,
        },
        payDetails,
        custDetails,
        extras: {
          udf1: "",
          udf2: "",
          udf3: "",
          udf4: "",
          udf5: "",
        },
      },
    };
  }

  static async initiatePayment(details, location) {
    const credentials = getAtomCredentials(location);
    const merchantId = credentials.merchantId;

    const authUrl = requireConfig("ATOM_AUTH_URL", envConfig.ATOM_AUTH_URL);

    const checkoutJsUrl = requireConfig(
      "ATOM_CHECKOUT_JS_URL",
      envConfig.ATOM_CHECKOUT_JS_URL
    );

    const baseUrl = requireConfig("BASE_URL", envConfig.BASE_URL);
    console.log({ baseUrl });
    requireConfig(
      "ATOM_REQUEST_ENCRYPTION_KEY",
      credentials.requestEncryptionKey
    );

    requireConfig(
      "ATOM_RESPONSE_DECRYPTION_KEY",
      credentials.responseDecryptionKey
    );

    requireConfig("ATOM_PASSWORD", credentials.password);
    requireConfig("ATOM_PRODUCT_CODE", credentials.productCode);
    requireConfig("ATOM_MERCHANT_ID", credentials.merchantId);
    requireConfig("ATOM_RESPONSE_HASH_KEY", credentials.responseHashKey);

    const payload = this.buildAuthPayload({
      ...details,
      credentials,
    });

    console.log(payload, credentials);

    const encryptedRequest = encryptRequest(payload, credentials);
    console.log({ encryptedRequest });

    let response;

    
    try {
      response = await axios.post(
        authUrl,
        new URLSearchParams({
          merchId: credentials.merchantId,
          encData: encryptedRequest,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 20000,
        }
      );
    } catch (error) {
      console.log("err", error.response.data);

      // Do not log credentials, encryption keys or the complete request.
      throw new Error(
        `ATOM AUTH request failed: ${
          error.response?.status
            ? `HTTP ${error.response.status}`
            : error.code || "network error"
        }`
      );
    }
    console.log(
      authUrl,
      { merchId: merchantId },
      { encData: encryptedRequest }
    );
    console.log("[ATOM AUTH DIAGNOSTICS]", {
      merchantId,
      environment: envConfig.ATOM_ENV,
      authUrl,
      httpStatus: response.status,
      contentLength: response.headers["content-length"],
      contentType: response.headers["content-type"],
      responseDataLength: response.data?.length ?? 0,
      responseData: response.data,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error(
        `ATOM returned an empty response for merchant ${merchantId}. HTTP ${response.status}`
      );
    }
    const encryptedResponse = extractEncryptedData(response.data);

    console.log("[ATOM PAYMENT INITIATED]", {
      merchantConfigured: Boolean(merchantId),
      environment: envConfig.ATOM_ENV,
    });

    if (!encryptedResponse) {
      throw new Error(
        "ATOM did not return an encrypted authentication response"
      );
    }

    const authResponse = decryptResponse(encryptedResponse, credentials);

    if (
      String(authResponse?.responseDetails?.txnStatusCode) !== "OTS0000" ||
      !authResponse?.atomTokenId
    ) {
      throw new Error(
        authResponse?.responseDetails?.txnMessage ||
          authResponse?.responseDetails?.txnDescription ||
          "ATOM could not initialize this payment"
      );
    }

    return {
      atomTokenId: String(authResponse.atomTokenId),
      merchId: merchantId,
      custEmail: String(details.email).trim(),
      custMobile: String(details.phone).trim(),
      returnUrl: `${baseUrl.replace(/\/+$/, "")}/api/booking/atom-response`,
      checkoutJsUrl,
      environment: envConfig.ATOM_ENV,
    };
  }

  static decodeCallback(encryptedData, locationName) {
    const credentials = getAtomCredentials(locationName);

    return decryptResponse(encryptedData, credentials);
  }

  static verifyCallbackSignature(response, locationName) {
    const credentials = getAtomCredentials(locationName);

    const hashKey = requireConfig(
      "ATOM_RESPONSE_HASH_KEY",
      credentials.responseHashKey
    );

    const instrument = response?.payInstrument;
    const merchant = instrument?.merchDetails;

    if (String(merchant?.merchId) !== String(credentials.merchantId)) {
      return false;
    }
    const payment = instrument?.payDetails;
    const mode = instrument?.payModeSpecificData;
    const details = instrument?.responseDetails;
    const subChannel = Array.isArray(mode?.subChannel)
      ? mode.subChannel[0]
      : mode?.subChannel;
    const bankTxnId = mode?.bankDetails?.bankTxnId;

    if (
      !merchant?.merchId ||
      !payment?.atomTxnId ||
      !merchant?.merchTxnId ||
      !Number.isFinite(Number(payment.totalAmount)) ||
      !details?.statusCode ||
      !subChannel
    ) {
      return false;
    }

    const suppliedSignature = payment.signature;

    if (
      typeof suppliedSignature !== "string" ||
      !/^[0-9a-f]{128}$/i.test(suppliedSignature.trim())
    ) {
      return false;
    }

    // Concatenation order is taken from the uploaded ATOM integration PDF.
    const signatureInput = [
      String(merchant.merchId),
      String(payment.atomTxnId),
      String(merchant.merchTxnId),
      Number(payment.totalAmount).toFixed(2),
      String(details.statusCode),
      String(subChannel),
      bankTxnId == null ? "" : String(bankTxnId),
    ].join("");

    const expected = generateHmacSha512(signatureInput, hashKey);

    const actualBuffer = Buffer.from(suppliedSignature.trim(), "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (
      actualBuffer.length !== expectedBuffer.length ||
      actualBuffer.length === 0
    ) {
      return false;
    }

    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  }

  static decodeAndVerifyCallback(encryptedData) {
    let lastError;

    for (const locationName of ATOM_LOCATION_NAMES) {
      try {
        const response = this.decodeCallback(encryptedData, locationName);

        const isValid = this.verifyCallbackSignature(response, locationName);

        if (isValid) {
          return {
            response,
            locationName,
          };
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `Unable to verify ATOM callback with configured merchant credentials: ${
        lastError?.message || "Invalid callback"
      }`
    );
  }
}

export default AtomPaymentService;