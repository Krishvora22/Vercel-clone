import dotenv from 'dotenv';
dotenv.config();

import redis from '../utils/redis';

(async () => {
  await redis.set('test', 'Hello from Upstash');
  const value = await redis.get('test');
  process.exit(0);
})();
