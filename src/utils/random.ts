import crypto from "crypto";

export const generateRandomSecret = () => {
  const buffer = crypto.randomBytes(256);
  return crypto
    .createHash("sha256")
    .update(buffer as any)
    .digest("hex");
};

console.log(generateRandomSecret());
