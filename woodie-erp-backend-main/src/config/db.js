const mongoose = require("mongoose");

function sanitizeMongoUri(uri) {
  if (!uri || (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://"))) {
    return uri;
  }

  const [scheme, rest] = uri.split("://");
  if (!rest || !rest.includes("@")) return uri;

  const [credentials, ...hostParts] = rest.split("@");
  if (!credentials.includes(":")) return uri;

  const [username, ...passwordParts] = credentials.split(":");
  const rawPassword = passwordParts.join(":");
  if (!rawPassword) return uri;

  let encodedPassword = "";
  try {
    encodedPassword = encodeURIComponent(decodeURIComponent(rawPassword));
  } catch {
    encodedPassword = encodeURIComponent(rawPassword);
  }

  return `${scheme}://${username}:${encodedPassword}@${hostParts.join("@")}`;
}

async function connectDb() {
  const mongoUri = sanitizeMongoUri(process.env.MONGODB_URI) || "mongodb://127.0.0.1:27017/woodie_erp";

  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });
}

module.exports = { connectDb };
