import { Injectable, Logger } from '@nestjs/common';
import { openai } from '../../common/openai-client';
import { ENV } from '../../config/env';
import { LinkSummary, LinkSummarySchema } from '@repo/shared';
import { withRetry } from '../../common/utils/retry';

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
}

export interface EmailWithLinkSummaries {
  from: string;
  subject: string;
  body: string;
  linkSummaries: LinkSummary[];
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  async summarizeLink(
    url: string,
    page: ScrapedPage,
    anchorText: string,
  ): Promise<LinkSummary> {
    return withRetry(async () => {
      const response = await openai.chat.completions.create({
        model: ENV.DEEPSEEK_MODEL,
        messages: [
          {
            role: 'user',
            content: `You will write a plain-prose summary of a web article, for inclusion in an email digest.

The article was linked from an email under the headline/anchor text: "${anchorText || '(no anchor text available)'}"
URL: ${url}

Write a summary of AT LEAST 100 words (aim for 100-180 words) covering: what the article is actually about, the main facts/claims/findings, and why it might matter to the reader. Write in flowing prose (not bullet points). Do not repeatedly say "the article" or "this webpage" — write as if briefing someone on the news itself.

Use the anchor text above as a strong hint for the article's real subject if the scraped content below is noisy, paywalled, or mostly navigation/boilerplate (this happens often — in that case prioritize the anchor text's implied topic over garbled scrape content).

Return ONLY a JSON object with exactly these fields:
{
  "anchorText": "<cleaned-up version of the anchor text, or your best short title if it's missing/generic>",
  "title": "<the article's actual title if you can determine one from the content>",
  "summary": "<your >=100 word prose summary>"
}

Scraped page content:
${page.text}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in LLM response');
      }

      const parsed = JSON.parse(content);
      // Spread the model's fields first so its cleaned-up anchorText/title/summary win,
      // then re-assert `url` last so a hallucinated url field can never override the real one.
      const result = LinkSummarySchema.safeParse({
        anchorText,
        ...parsed,
        url,
      });

      if (!result.success) {
        this.logger.warn(
          `Failed to parse link summary for ${url}:`,
          result.error,
        );
        throw new Error(`Invalid link summary format: ${result.error}`);
      }

      const wordCount =
        result.data.summary?.trim().split(/\s+/).filter(Boolean).length ?? 0;
      if (wordCount < 100) {
        this.logger.warn(
          `Link summary for ${url} is under 100 words (${wordCount})`,
        );
      }

      return result.data;
    });
  }

  async summarizeEmails(emails: EmailWithLinkSummaries[]): Promise<string> {
    return withRetry(async () => {
      const emailsBlock = emails
        .map((e, i) => {
          const linksBlock = e.linkSummaries.length
            ? e.linkSummaries
                .map(
                  (l) =>
                    `  - Read-more URL: ${l.url}\n    Headline: ${l.anchorText || l.title || l.url}\n    Pre-written summary (reuse verbatim, do not rewrite): ${l.summary || '(no summary available)'}`,
                )
                .join('\n')
            : '  (no links in this email)';

          return `EMAIL ${i + 1}\nFrom: ${e.from}\nSubject: ${e.subject}\nBody:\n${e.body}\n\nLinks in this email:\n${linksBlock}`;
        })
        .join('\n\n===\n\n');

      const response = await openai.chat.completions.create({
        model: ENV.DEEPSEEK_MODEL,
        messages: [
          {
            role: 'user',
            content: `You are formatting a daily email digest in Markdown. Below is a list of emails from today, each already broken out with its own pre-written link summaries. Your ONLY job is to produce one Markdown section per email, in the same order given. Do NOT add an introduction, a title, an overall summary, a "key decisions" or "action items" table, or any closing remarks — output starts directly at the first email's section and ends directly after the last.

STRICT RULES:
1. One section per email — never merge, group, or cross-reference multiple emails together.
2. Each section starts with a bolded title line: **<a short, specific title for this email/news item, derived from its subject>** — not the literal email subject if it's redundant/spammy, but a clean human title capturing what it's about.
3. Follow the title with 1-3 sentences of prose based on the email's own body content (not the linked articles) — what is this email actually telling the reader.
4. If the email has links, follow with the PRE-WRITTEN summary text for each link EXACTLY as given (do not shorten, rewrite, or merge it with other links' summaries), each ending with its own line: [Read more](<url>)
5. If the email has no links, the section ends after step 3 — do not fabricate a "Read more" link.
6. No top-level Markdown headings (no # or ##) anywhere in the output — use only the bolded title format from rule 2 for each section.
7. No "Key Decisions", "Action Items", or similar synthesized/aggregated tables or bullet lists across emails.
8. Separate each email's section from the next with a single blank line (a horizontal rule "---" is fine between sections, but nothing else).

Emails:

${emailsBlock}`,
          },
        ],
        temperature: 0.4,
      });

      const summary = response.choices[0]?.message?.content;
      if (!summary) {
        throw new Error('No summary content from LLM');
      }

      return summary;
    });
  }
}
