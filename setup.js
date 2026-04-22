#!/usr/bin/env node

/**
 * Vercel Local Development Setup Script
 * Helps you configure environment variables and test locally
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function setup() {
  console.log('\n🚀 Breakfastclub Orders Portal - Local Setup\n');

  const envFile = path.join(__dirname, '.env.local');
  const envExists = fs.existsSync(envFile);

  if (envExists) {
    const overwrite = await question('`.env.local` already exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n📋 Please provide your configuration values:\n');

  const config = {
    SUPABASE_URL: await question('Supabase URL: '),
    SUPABASE_SERVICE_ROLE_KEY: await question('Supabase Service Role Key: '),
    RECAPTCHA_SECRET_KEY: await question('reCAPTCHA Secret Key: '),
    WA_PHONE_NUMBER_ID: await question('WhatsApp Phone Number ID: '),
    WA_ACCESS_TOKEN: await question('WhatsApp Access Token: '),
    RAZORPAY_KEY_ID: await question('Razorpay Key ID: '),
    RAZORPAY_KEY_SECRET: await question('Razorpay Key Secret: '),
    SESSION_SECRET: await question('Session Secret (min 32 chars): '),
  };

  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envFile, envContent);
  console.log('\n✅ `.env.local` created successfully!\n');
  console.log('📌 Next steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: npm run dev');
  console.log('3. Open: http://localhost:3000\n');

  rl.close();
}

setup().catch(console.error);
