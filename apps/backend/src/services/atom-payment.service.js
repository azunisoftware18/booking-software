import { envConfig } from "../config/env.config.js";
import crypto from "node:crypto";
import axios from "axios";

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

const atomIv = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

function deriveKey(key) {
  if (!key) {
    throw new Error("ATOM encryption keys are not configured");
  }

  const password = Buffer.from(key, "utf8");
  return crypto.pbkdf2Sync(password, password, 65536, 32, "sha512");
}

function encryptRequest(payload) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    deriveKey(envConfig.ATOM_REQUEST_ENCRYPTION_KEY),
    atomIv,
  );
  return Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]).toString("hex");
}

function decryptResponse(encryptedData) {
  if (typeof encryptedData !== "string" || !/^(?:[0-9a-f]{2})+$/i.test(encryptedData)) {
    throw new Error("ATOM returned an invalid encrypted response");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    deriveKey(envConfig.ATOM_RESPONSE_DECRYPTION_KEY),
    atomIv,
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, "hex")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(decrypted);
}

function extractEncryptedData(responseBody) {
  if (typeof responseBody === "string") {
    return new URLSearchParams(responseBody).get("encData");
  }

  return responseBody?.encData;
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
    if (!txnId || txnId.length > 50) {
      throw new Error("A valid ATOM transaction ID is required");
    }

    if (!email || !phone) {
      throw new Error("Customer email and mobile are required");
    }

    const payDetails = {
      amount: Number(amount).toFixed(2),
      product: envConfig.ATOM_PRODUCT_CODE,
      txnCurrency: "INR",
    };

    // Required only for TPV transactions
    if (custAccNo) {
      payDetails.custAccNo = custAccNo;
    }

    const custDetails = {
      custEmail: email,
      custMobile: String(phone),
    };

    // Include when required for the UP subchannel
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
          merchId: String(envConfig.ATOM_MERCHANT_ID),
          userId,
          password: envConfig.ATOM_PASSWORD,
          merchTxnId: txnId,
          merchTxnDate: formatAtomDate(),
        },

        payDetails,
        custDetails,
      },
    };
  }

  static async initiatePayment(details) {
    if (
      !envConfig.ATOM_MERCHANT_ID ||
      !envConfig.ATOM_PASSWORD ||
      !envConfig.ATOM_PRODUCT_CODE ||
      !envConfig.BASE_URL ||
      !envConfig.FRONTEND_URL
    ) {
      throw new Error(
        "ATOM merchant credentials, BASE_URL, and FRONTEND_URL must be configured",
      );
    }

    const payload = this.buildAuthPayload({
      txnId: details.txnId,
      amount: details.amount,
      email: details.email,
      phone: details.phone,
    });

    const response = await axios.post(
      envConfig.ATOM_AUTH_URL,
      new URLSearchParams({
        encData: encryptRequest(payload),
        merchId: String(envConfig.ATOM_MERCHANT_ID),
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 20000,
      },
    );

    const encryptedData = extractEncryptedData(response.data);
    if (!encryptedData) {
      throw new Error("ATOM did not return an encrypted authentication response");
    }

    const authResponse = decryptResponse(encryptedData);
    if (
      authResponse?.responseDetails?.txnStatusCode !== "OTS0000" ||
      !authResponse?.atomTokenId
    ) {
      throw new Error(
        authResponse?.responseDetails?.message ||
          "ATOM could not initialize this payment",
      );
    }

    return {
      atomTokenId: String(authResponse.atomTokenId),
      merchId: String(envConfig.ATOM_MERCHANT_ID),
      custEmail: details.email,
      custMobile: String(details.phone),
      returnUrl: `${envConfig.BASE_URL.replace(/\/+$/, "")}/api/booking/atom-response`,
      checkoutJsUrl: envConfig.ATOM_CHECKOUT_JS_URL,
      environment: envConfig.ATOM_ENV,
    };
  }

  static decodeCallback(encryptedData) {
    return decryptResponse(encryptedData);
  }

  static verifyCallbackSignature(response) {
    const instrument = response?.payInstrument;
    const merchantDetails = instrument?.merchDetails;
    const payDetails = instrument?.payDetails;
    const responseDetails = instrument?.responseDetails;
    const modeSpecificData = instrument?.payModeSpecificData;
    const subChannel = modeSpecificData?.subChannel?.[0];
    const bankTxnId = modeSpecificData?.bankDetails?.bankTxnId;
    const receivedSignature = payDetails?.signature;

    if (
      !merchantDetails?.merchId ||
      !payDetails?.atomTxnId ||
      !merchantDetails?.merchTxnId ||
      !Number.isFinite(Number(payDetails?.totalAmount)) ||
      !responseDetails?.statusCode ||
      !subChannel ||
      !bankTxnId ||
      !receivedSignature ||
      !envConfig.ATOM_RESPONSE_HASH_KEY
    ) {
      return false;
    }

    const signatureData = [
      String(merchantDetails.merchId),
      String(payDetails.atomTxnId),
      String(merchantDetails.merchTxnId),
      Number(payDetails.totalAmount).toFixed(2),
      String(responseDetails.statusCode),
      String(subChannel),
      String(bankTxnId),
    ].join("");

    const expectedSignature = crypto
      .createHmac("sha512", envConfig.ATOM_RESPONSE_HASH_KEY)
      .update(signatureData, "utf8")
      .digest();
    const receivedSignatureBuffer = Buffer.from(
      String(receivedSignature).toLowerCase(),
      "hex",
    );

    return (
      receivedSignatureBuffer.length === expectedSignature.length &&
      crypto.timingSafeEqual(receivedSignatureBuffer, expectedSignature)
    );
  }
}

export default AtomPaymentService;
