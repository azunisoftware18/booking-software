import { envConfig } from "../config/env.config.js";

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
          merchId: Number(envConfig.ATOM_MERCHANT_ID),
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
    const payload = this.buildAuthPayload({
      txnId: details.txnId,
      amount: details.amount,
      email: details.email,
      phone: details.phone,
    });

    // The official ATOM encryption, authentication request,
    // and Atom Token ID extraction must be implemented here.
    // Do not send this raw payload directly to the gateway.
    throw new Error(
      "ATOM authentication is not connected yet. Add the official ATOM Node.js encryption/request implementation."
    );
  }
}

export default AtomPaymentService;
