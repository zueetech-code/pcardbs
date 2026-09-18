"use server"

import { pool } from "@/lib/db"
import crypto from "crypto"

const key = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPTION_SECRET!)
  .digest()

interface SaveDbConfigInput {
  clientId: string
  host: string
  port: number
  database: string
  username: string
  password: string
}

function encrypt(text: string) {
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(16)

  const dk = crypto.pbkdf2Sync(
    process.env.ENCRYPTION_SECRET!,
    salt,
    100000,
    32,
    "sha256"
  )

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    dk,
    iv
  )

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ])

  return (
    salt.toString("hex") +
    ":" +
    iv.toString("hex") +
    ":" +
    encrypted.toString("hex")
  )
}

export async function saveDbConfig(data: SaveDbConfigInput) {
  const { clientId, host, port, database, username, password } = data

  const encryptedUsername = encrypt(username)
  const encryptedPassword = encrypt(password)

  await pool.query(
    `
    INSERT INTO db_configs
      (client_id, host, port, database, username, password, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,NOW())
    ON CONFLICT (client_id)
    DO UPDATE SET
      host = EXCLUDED.host,
      port = EXCLUDED.port,
      database = EXCLUDED.database,
      username = EXCLUDED.username,
      password = EXCLUDED.password,
      updated_at = NOW()
  `,
    [clientId, host, port, database, encryptedUsername, encryptedPassword]
  )

  return { success: true }
}