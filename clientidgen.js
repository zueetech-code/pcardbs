import { randomBytes } from "crypto";

function generateClientId(length = 20) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let id = "";

  for (let i = 0; i < length; i++) {
    id += chars[bytes[i] % chars.length];
  }

  return id;
}

const clientId = generateClientId(20);
console.log(clientId);