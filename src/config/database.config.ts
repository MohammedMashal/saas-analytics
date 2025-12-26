import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: process.env.DB_TYPE,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  name: process.env.DB_NAME,
  synchronize: process.env.NODE_ENV === 'development',
}));
