import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("Missing REDIS_URL environment variable !!");
}

const redis = new Redis(process.env.REDIS_URL!, {
  tls: {},
});

redis.on("connect", () => {
  console.log("Connected to Redis server");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

export default redis;
