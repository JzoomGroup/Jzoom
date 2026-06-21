import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";

const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 32 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N: COST,
        r: BLOCK_SIZE,
        p: PARALLELIZATION,
        maxmem: MAX_MEMORY,
      },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(key);
      },
    );
  });
}

@Injectable()
export class PasswordHasherService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await deriveKey(password, salt);

    return [
      "scrypt",
      COST,
      BLOCK_SIZE,
      PARALLELIZATION,
      salt.toString("base64url"),
      key.toString("base64url"),
    ].join("$");
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    const [algorithm, cost, blockSize, parallelization, encodedSalt, encodedKey] =
      encodedHash.split("$");

    if (
      algorithm !== "scrypt" ||
      Number(cost) !== COST ||
      Number(blockSize) !== BLOCK_SIZE ||
      Number(parallelization) !== PARALLELIZATION ||
      !encodedSalt ||
      !encodedKey
    ) {
      return false;
    }

    const expectedKey = Buffer.from(encodedKey, "base64url");
    const actualKey = await deriveKey(password, Buffer.from(encodedSalt, "base64url"));

    return expectedKey.length === actualKey.length && timingSafeEqual(expectedKey, actualKey);
  }
}
