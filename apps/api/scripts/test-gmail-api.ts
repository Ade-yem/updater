import 'dotenv/config';
import { GmailService } from '../src/features/google/gmail.service';
import { GoogleAuthRepository } from '../src/features/google/google.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function runStandaloneGmailTest() {
  console.log('Building isolated dependencies for Gmail testing loop...');

  // Initialize raw infrastructure targets
  const prisma = new PrismaService()
  const googleAuthRepo = new GoogleAuthRepository(prisma)
  const gmailService = new GmailService(googleAuthRepo) 
  // Target User ID to evaluate (Replace this with an active testing UUID present in your local DB)
  const TARGET_TEST_USER_ID = "f86acb65-060b-43f5-aa46-78411a46917d";
  // const TARGET_TEST_USER_ID = process.argv[2];

  if (!TARGET_TEST_USER_ID) {
    console.error('❌ Error: Please provide a valid local database User UUID string as an argument.');
    console.error('Example: npx tsx scripts/test-gmail-extraction.ts "your-user-uuid-here"');
    process.exit(1);
  }

  try {
    console.log(`Executing query fetch operation targeting User: ${TARGET_TEST_USER_ID}`);
    const results = await gmailService.fetchTodayEmailsForUser(TARGET_TEST_USER_ID);

    console.log('\n--- Extraction Pipeline Summary Results ---');
    console.log(`Total Emails Processed: ${results.length}\n`);

    results.forEach((email, index) => {
      console.log(`[Email #${index + 1}]`);
      console.log(`From:    ${email.from}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`Links Found (${email.urls.length}):`, email.urls.slice(0, 3)); // show first 3
      console.log('-'.repeat(40));
    });

    console.log('\n✅ Gmail Extraction test suite finished running clean.');
  } catch (error) {
    console.error('\n❌ Fatal error running extraction loop testing suite:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runStandaloneGmailTest();