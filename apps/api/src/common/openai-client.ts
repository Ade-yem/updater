import OpenAI from 'openai';
import { ENV } from '../config/env';

export const openai = new OpenAI({
  apiKey: ENV.DEEPSEEK_API_KEY,
  baseURL: ENV.DEEPSEEK_API_URL,
});
