// Pix BR Code (EMV®-QRCPS) payload generator with CRC16-CCITT checksum.
// Produces a valid "Pix Copia e Cola" string that any Brazilian banking
// app can read, given a real Pix key.

const PIX_KEY = "thamarralouis46@gmail.com"; // troque pela sua chave Pix real
const MERCHANT_NAME = "THAMART BIJOUX";
const MERCHANT_CITY = "SAO PAULO";

function emv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(amount: number, txid: string): string {
  const merchantAccount = emv(
    "26",
    emv("00", "br.gov.bcb.pix") + emv("01", PIX_KEY)
  );
  const payload =
    emv("00", "01") + // payload format
    merchantAccount +
    emv("52", "0000") + // merchant category code
    emv("53", "986") + // currency BRL
    emv("54", amount.toFixed(2)) +
    emv("58", "BR") +
    emv("59", MERCHANT_NAME) +
    emv("60", MERCHANT_CITY) +
    emv("62", emv("05", txid.slice(0, 25))) +
    "6304"; // CRC placeholder
  return payload + crc16(payload);
}

export function makeTxid(): string {
  return (
    "THA" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}
