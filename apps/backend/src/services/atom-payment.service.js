import crypto from "node:crypto";
import axios from "axios";
import { envConfig } from "../config/env.config.js";

const IV = Buffer.from(
  Array.from({ length: 16 }, (_, index) => index)
);

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

  return `${values.year}-${values.month}-${values.day} ` +
    `${values.hour}:${values.minute}:${values.second}`;
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

function encryptRequest(payload) {
  const password = requireConfig(
    "ATOM_REQUEST_ENCRYPTION_KEY",
    envConfig.ATOM_REQUEST_ENCRYPTION_KEY
  );

  const key = deriveAesKey(password).subarray(0, 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, IV);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);

  return encrypted.toString("hex").toUpperCase();
}

function decryptResponse(encryptedData) {
  const password = requireConfig(
    "ATOM_RESPONSE_DECRYPTION_KEY",
    envConfig.ATOM_RESPONSE_DECRYPTION_KEY
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
  }) {
    if (
      typeof txnId !== "string" ||
      !txnId.trim() ||
      txnId.length > 50
    ) {
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
      product: requireConfig(
        "ATOM_PRODUCT_CODE",
        envConfig.ATOM_PRODUCT_CODE
      ),
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
            requireConfig(
              "ATOM_MERCHANT_ID",
              envConfig.ATOM_MERCHANT_ID
            )
          ),
          userId: String(userId),
          password: requireConfig(
            "ATOM_PASSWORD",
            envConfig.ATOM_PASSWORD
          ),
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

  static async initiatePayment(details) {
    const merchantId = requireConfig(
      "ATOM_MERCHANT_ID",
      envConfig.ATOM_MERCHANT_ID
    );

    const authUrl = requireConfig(
      "ATOM_AUTH_URL",
      envConfig.ATOM_AUTH_URL
    );

    const checkoutJsUrl = requireConfig(
      "ATOM_CHECKOUT_JS_URL",
      envConfig.ATOM_CHECKOUT_JS_URL
    );

    const baseUrl = requireConfig("BASE_URL", envConfig.BASE_URL);

    requireConfig(
      "ATOM_REQUEST_ENCRYPTION_KEY",
      envConfig.ATOM_REQUEST_ENCRYPTION_KEY
    );

    requireConfig(
      "ATOM_RESPONSE_DECRYPTION_KEY",
      envConfig.ATOM_RESPONSE_DECRYPTION_KEY
    );

    requireConfig("ATOM_PASSWORD", envConfig.ATOM_PASSWORD);
    requireConfig("ATOM_PRODUCT_CODE", envConfig.ATOM_PRODUCT_CODE);

    const payload = this.buildAuthPayload(details);
    const encryptedRequest = encryptRequest(payload);

    let response;

    try {
      response = await axios.post(
        authUrl,
        new URLSearchParams({
          merchId: merchantId,
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
      // Do not log credentials, encryption keys or the complete request.
      throw new Error(
        `ATOM AUTH request failed: ${
          error.response?.status
            ? `HTTP ${error.response.status}`
            : error.code || "network error"
        }`
      );
    }

    const encryptedResponse = extractEncryptedData(response.data);

    if (!encryptedResponse) {
      throw new Error(
        "ATOM did not return an encrypted authentication response"
      );
    }

    const authResponse = decryptResponse(encryptedResponse);

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

  static decodeCallback(encryptedData) {
    return decryptResponse(encryptedData);
  }

  static verifyCallbackSignature(response) {
    const hashKey = requireConfig(
      "ATOM_RESPONSE_HASH_KEY",
      envConfig.ATOM_RESPONSE_HASH_KEY
    );

    const instrument = response?.payInstrument;
    const merchant = instrument?.merchDetails;
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
}


export default AtomPaymentService;