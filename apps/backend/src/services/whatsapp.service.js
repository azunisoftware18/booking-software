import axios from "axios";

class WhatsappService {
  static async sendTicket(phone, message, pdfUrl) {
    try {
      let number = String(phone).replace(/\D/g, "");

      if (!number.startsWith("91")) {
        number = `91${number}`;
      }

      const response = await axios.get(
        "https://aumsg.in/send",
        {
          params: {
            token: process.env.WHATSAPP_TOKEN,
            number: number,
            message: message,
            image_url: pdfUrl,
          },
        }
      );


      return response.data;
    } catch (error) {
      console.log("WhatsApp Error");

    
      return null;
    }
  }
}

export default WhatsappService;