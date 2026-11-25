import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { eq } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import { knowledgeArticles } from '../../../src/db/schema.ts';
import { AppError } from '../middleware/errorHandler.ts';

export const NO_KB_ANSWER_FALLBACK =
  "I'm sorry, I couldn't find a reliable answer to your question. Let me connect you with a human support agent who can assist you.";

const SYSTEM_INSTRUCTION = `You are Support Flow AI, a professional customer support assistant.

Your responsibility is to help customers understand products and services using only approved information provided by the organization's knowledge base.

Always be polite, professional, clear and helpful.

Never invent business policies, product details, prices, refund rules or account information.

If the answer is not supported by the available knowledge base, explain that you cannot provide a reliable answer and offer human assistance. In that case, set groundedInKnowledgeBase to false and use this exact fallback message as your reply:
"${NO_KB_ANSWER_FALLBACK}"

Identify sensitive or complex enquiries and recommend escalation to a human support agent.

Do not request passwords, payment card information or unnecessary sensitive personal information.

Clearly identify yourself as an AI assistant.

Do not pretend to be a human support agent.

Your primary objective is to provide accurate support and ensure unresolved enquiries reach the correct human support department.`;

export interface KnowledgeMatch {
  id: number;
  title: string;
  question: string;
  answer: string;
  category: string;
  keywords: string;
  score: number;
}

export interface SupportAssistantResult {
  reply: string;
  category: string;
  intent: string;
  recommendedDepartment: string;
  recommendEscalation: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  groundedInKnowledgeBase: boolean;
  citedArticles: Array<{ id: number; title: string; category: string }>;
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'and',
  'or',
  'my',
  'me',
  'i',
  'you',
  'we',
  'it',
  'can',
  'how',
  'what',
  'when',
  'where',
  'why',
  'do',
  'does',
  'did',
  'please',
  'help',
  'need',
  'want',
  'have',
  'has',
  'about',
  'this',
  'that',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export async function retrievePublishedKnowledge(
  query: string,
  limit = 6
): Promise<KnowledgeMatch[]> {
  const articles = await db
    .select()
    .from(knowledgeArticles)
    .where(eq(knowledgeArticles.isPublished, true));

  if (articles.length === 0) {
    return [];
  }

  const queryLower = query.toLowerCase();
  const tokens = tokenize(query);

  const scored: KnowledgeMatch[] = articles.map((article) => {
    const titleLower = article.title.toLowerCase();
    const questionLower = article.question.toLowerCase();
    const answerLower = article.answer.toLowerCase();
    const keywordsLower = article.keywords.toLowerCase();
    const categoryLower = article.category.toLowerCase();

    let score = 0;

    if (queryLower.length >= 4) {
      if (titleLower.includes(queryLower)) score += 12;
      if (questionLower.includes(queryLower)) score += 10;
    }

    for (const token of tokens) {
      if (keywordsLower.includes(token)) score += 5;
      if (titleLower.includes(token)) score += 4;
      if (questionLower.includes(token)) score += 3;
      if (categoryLower.includes(token)) score += 2;
      if (answerLower.includes(token)) score += 1.5;
    }

    return {
      id: article.id,
      title: article.title,
      question: article.question,
      answer: article.answer,
      category: article.category,
      keywords: article.keywords,
      score,
    };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new AppError(
      'Gemini AI service is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
      503,
      'GEMINI_NOT_CONFIGURED'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 18000,
    },
  });
}

export async function generateGroundedSupportReply(params: {
  customerMessage: string;
  conversationHistory: Array<{ senderType: string; message: string }>;
  availableDepartments: string[];
}): Promise<SupportAssistantResult> {
  const matchedArticles = await retrievePublishedKnowledge(params.customerMessage);
  const ai = getGeminiClient();

  const kbContext =
    matchedArticles.length > 0
      ? matchedArticles
          .map(
            (a) =>
              `[Article ID: ${a.id}] Category: ${a.category}\nTitle: ${a.title}\nQuestion: ${a.question}\nApproved Answer: ${a.answer}`
          )
          .join('\n\n---\n\n')
      : 'NO MATCHING APPROVED KNOWLEDGE ARTICLES WERE FOUND.';

  const recentHistory = params.conversationHistory
    .slice(-8)
    .map((m) => `${m.senderType}: ${m.message}`)
    .join('\n');

  const prompt = `Available Support Departments: ${params.availableDepartments.join(', ')}

Approved Published Knowledge Base Articles:
${kbContext}

Recent Conversation History:
${recentHistory || 'None (start of conversation)'}

Latest Customer Message:
${params.customerMessage}

Instructions:
1. Classify the customer's enquiry category into one of: Technical, Billing, Sales, Complaints, General.
2. Identify a short intent phrase (e.g., "password_reset", "invoice_dispute", "enterprise_pricing", "api_rate_limit", "service_complaint", "greeting").
3. Recommend the single best department from the Available Support Departments list.
4. Answer the customer's question ONLY using facts from the Approved Published Knowledge Base Articles above.
   - If the customer is simply greeting you (e.g. "hi", "hello", "thanks"), respond politely as Support Flow AI and ask how you can help, setting groundedInKnowledgeBase to true and recommendEscalation to false.
   - If the customer asks a factual/policy/product/account question that is NOT reliably answered by the Approved Published Knowledge Base Articles above, set groundedInKnowledgeBase to false, recommendEscalation to true, confidence to "LOW", and set reply to: "${NO_KB_ANSWER_FALLBACK}"
   - If the customer expresses anger, a formal complaint, a refund dispute, data breach/security urgency, or explicitly asks for a human agent, set recommendEscalation to true.
5. List the exact Article IDs used in citedArticleIds (empty array if none used).`;

  const startedAt = Date.now();
  const callModel = async (
    model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite'
  ) => {
    return ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        ...(model === 'gemini-4-hydrogen'
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
          : {}),
        abortSignal: AbortSignal.timeout(12000),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Customer-facing response grounded strictly in approved knowledge articles.',
            },
            category: {
              type: Type.STRING,
              description: 'One of: Technical, Billing, Sales, Complaints, General',
            },
            intent: {
              type: Type.STRING,
              description: 'Short snake_case customer intent label',
            },
            recommendedDepartment: {
              type: Type.STRING,
              description: 'Best matching department name from the available departments list',
            },
            recommendEscalation: {
              type: Type.BOOLEAN,
              description: 'True if human agent escalation is recommended or requested',
            },
            confidence: {
              type: Type.STRING,
              description: 'HIGH, MEDIUM, or LOW',
            },
            groundedInKnowledgeBase: {
              type: Type.BOOLEAN,
              description: 'True if the reply is directly supported by approved KB articles or is a polite conversational greeting',
            },
            citedArticleIds: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: 'IDs of knowledge articles used to form the reply',
            },
          },
          required: [
            'reply',
            'category',
            'intent',
            'recommendedDepartment',
            'recommendEscalation',
            'confidence',
            'groundedInKnowledgeBase',
            'citedArticleIds',
          ],
        },
      },
    });
  };

  try {
    let response;
    try {
      response = await callModel('gemini-4-hydrogen');
    } catch (primaryErr: any) {
      const primaryStatus = primaryErr?.status || primaryErr?.statusCode;
      const isTransient =
        primaryStatus === 503 ||
        primaryStatus === 504 ||
        primaryErr?.name === 'AbortError' ||
        primaryErr?.name === 'TimeoutError';

      if (!isTransient) {
        throw primaryErr;
      }

      console.warn(
        `[Gemini] Primary model unavailable (${primaryStatus || primaryErr?.name}) after ${Date.now() - startedAt}ms; retrying with gemini-3.1-flash-lite`
      );
      response = await callModel('gemini-3.1-flash-lite');
    }

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new AppError('Gemini returned an empty response.', 502, 'GEMINI_EMPTY_RESPONSE');
    }

    const parsed = JSON.parse(rawText) as {
      reply: string;
      category: string;
      intent: string;
      recommendedDepartment: string;
      recommendEscalation: boolean;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
      groundedInKnowledgeBase: boolean;
      citedArticleIds: number[];
    };

    const citedMap = new Map(matchedArticles.map((a) => [a.id, a]));
    const citedArticles = (parsed.citedArticleIds || [])
      .map((id) => citedMap.get(id))
      .filter((a): a is KnowledgeMatch => Boolean(a))
      .map((a) => ({ id: a.id, title: a.title, category: a.category }));

    const finalReply =
      !parsed.groundedInKnowledgeBase && citedArticles.length === 0
        ? NO_KB_ANSWER_FALLBACK
        : parsed.reply;

    return {
      reply: finalReply,
      category: parsed.category || 'General',
      intent: parsed.intent || 'general_enquiry',
      recommendedDepartment: parsed.recommendedDepartment || 'General Support',
      recommendEscalation: Boolean(parsed.recommendEscalation),
      confidence: parsed.confidence || 'MEDIUM',
      groundedInKnowledgeBase: Boolean(parsed.groundedInKnowledgeBase),
      citedArticles,
    };
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    const status = err?.status || err?.statusCode;
    console.error(`Gemini API error after ${Date.now() - startedAt}ms:`, err);
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      throw new AppError(
        'The AI assistant took too long to respond. Please try again or use "Talk to a Human".',
        504,
        'GEMINI_TIMEOUT'
      );
    }
    if (status === 400 || status === 403) {
      throw new AppError(
        'Gemini API key is invalid or unauthorized. Please check GEMINI_API_KEY in Settings > Secrets.',
        502,
        'GEMINI_AUTH_ERROR'
      );
    }
    if (status === 429) {
      throw new AppError(
        'AI assistant quota temporarily exceeded. Please try again shortly or connect with a human agent.',
        429,
        'GEMINI_RATE_LIMIT'
      );
    }
    if (status === 503) {
      throw new AppError(
        'The AI service is temporarily experiencing high demand. Please try again in a moment or click "Talk to a Human".',
        503,
        'GEMINI_UNAVAILABLE'
      );
    }
    throw new AppError(
      'Unable to reach the AI assistant right now. You can still use "Talk to a Human" to reach our support team.',
      502,
      'GEMINI_UPSTREAM_ERROR'
    );
  }
}
