import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { GoogleAuthRepository } from '../src/features/google/google.service';
import { GmailService } from '../src/features/google/gmail.service';
import { AgentService } from '../src/features/agent/agent.service';
import { ScraperService } from '../src/features/agent/scraper.service';
import { SseService } from '../src/features/sse/sse.service';
import { PushService } from '../src/features/push/push.service';
import { UserService } from '../src/features/users/users.service';
import { DigestService } from '../src/features/digest/digest.service';
import { DigestOrchestratorService } from '../src/features/digest/digest-orchestrator.service';

/**
 * Full end-to-end verification: runs the real orchestrator (Gmail -> scrape ->
 * LLM link summaries -> LLM final assembly -> persist) against the live
 * account, then prints the resulting digest row so the output shape/quality
 * can be inspected directly. This DOES hit the LLM and DB (upserts today's
 * digest for this user) — unlike the read-only extraction-only script.
 */

const TARGET_EMAIL = 'adejumoadeyemi32@gmail.com';

async function main() {
  const prisma = new PrismaService();
  try {
    const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
    if (!user) {
      console.error('No user found for', TARGET_EMAIL);
      return;
    }

    const googleAuthRepo = new GoogleAuthRepository(prisma);
    const gmailService = new GmailService(googleAuthRepo);
    const agentService = new AgentService();
    const scraperService = new ScraperService();
    const sseService = new SseService();
    const pushService = new PushService(prisma);
    const userService = new UserService(prisma);
    const digestService = new DigestService(prisma);

    // Log every SSE broadcast so we can see the started/completed lifecycle.
    sseService.subscribe(user.id).subscribe((msg) => {
      console.log(`[SSE] ${(msg.data as any).type}`);
    });

    const orchestrator = new DigestOrchestratorService(
      digestService,
      userService,
      gmailService,
      agentService,
      scraperService,
      sseService,
      pushService,
    );

    console.log(`Running full digest pipeline for ${TARGET_EMAIL} (force=true)...\n`);
    await orchestrator.processUserDigest(user.id, { force: true });

    const digest = await digestService.findToday(user.id);
    console.log('\n' + '='.repeat(70));
    console.log('RESULTING DIGEST ROW');
    console.log('='.repeat(70));
    console.log(`status: ${digest?.status}`);
    console.log(`linksProcessed count: ${digest?.linksProcessed.length}`);
    console.log('\n--- summaryMarkdown ---\n');
    console.log(digest?.summaryMarkdown);
    console.log('\n--- linksProcessed sample ---\n');
    console.log(JSON.stringify(digest?.linksProcessed.slice(0, 2), null, 2));
  } catch (err) {
    console.error('Fatal:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
