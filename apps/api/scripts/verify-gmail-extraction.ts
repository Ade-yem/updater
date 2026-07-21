import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { GoogleAuthRepository } from '../src/features/google/google.service';
import { GmailService } from '../src/features/google/gmail.service';

/**
 * Read-only verification of the fixed link-extraction logic against a live
 * Gmail account. No DB writes, no LLM calls — just confirms real article
 * links (with anchor text) now come through instead of tracker/junk links.
 */

const TARGET_EMAIL = 'adejumoadeyemi32@gmail.com';

async function main() {
  const prisma = new PrismaService();
  try {
    const user = await prisma.user.findUnique({
      where: { email: TARGET_EMAIL },
      include: { googleAuth: true },
    });
    if (!user?.googleAuth) {
      console.error('No user/credentials found for', TARGET_EMAIL);
      return;
    }

    const googleAuthRepo = new GoogleAuthRepository(prisma);
    const gmailService = new GmailService(googleAuthRepo);

    const emails = await gmailService.fetchTodayEmailsForUser(user.id);
    console.log(`Fetched ${emails.length} emails for today.\n`);

    let totalLinks = 0;
    let emailsWithLinks = 0;

    for (const email of emails) {
      totalLinks += email.urls.length;
      if (email.urls.length > 0) emailsWithLinks++;

      console.log('='.repeat(70));
      console.log(`FROM: ${email.from}`);
      console.log(`SUBJECT: ${email.subject}`);
      console.log(`Extracted links: ${email.urls.length}`);
      email.urls.slice(0, 6).forEach((l, i) => {
        console.log(`  ${i + 1}. "${l.anchorText.slice(0, 70)}"`);
        console.log(`     ${l.url.slice(0, 100)}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log(`Emails: ${emails.length}`);
    console.log(`Emails with >=1 extracted link: ${emailsWithLinks}`);
    console.log(`Total extracted links: ${totalLinks}`);
  } catch (err) {
    console.error('Fatal:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
