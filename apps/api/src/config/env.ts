export const ENV = {
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL,
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret',
  CRON_SECRET_KEY: process.env.CRON_SECRET_KEY || '',
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Generate a pair with: node -e "console.log(require('web-push').generateVAPIDKeys())"
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
};
