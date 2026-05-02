import dotenv from "dotenv";
dotenv.config();

import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error(
    "Missing REDIS_URL environment variable in runner service !!",
  );
}

const redis = new Redis(process.env.REDIS_URL!, { tls: {} });

redis.on("connect", () => console.log("$ Connected to Upstash Redis"));
redis.on("error", (err) => console.error("# Redis error", err));

export default redis;
