import 'dotenv/config';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import express from 'express';
import cors from 'cors';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { missions } from './missions.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const app = express();
const port = Number(process.env.PORT || 8787);
const progressStore = new Map();
const useAws = process.env.USE_AWS === 'true';
const region = process.env.AWS_REGION || 'ca-central-1';
const tableName = process.env.GUARDSIM_PROGRESS_TABLE || 'GuardSimProgress';
const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';
const pollyVoiceId = process.env.POLLY_VOICE_ID || 'Joanna';
const manualPdfPath =
  process.env.MANUAL_PDF_PATH ||
  'C:/Users/hp/AppData/Roaming/Cursor/User/workspaceStorage/02002a0029211450f478ae1b8f9b6b62/pdfs/2ed6a15d-7fd1-44da-b192-603d3fa8dc39/abst-particpants-manual-oct-2014-2.pdf';

const bedrock = useAws ? new BedrockRuntimeClient({ region }) : null;
const translate = useAws ? new TranslateClient({ region }) : null;
const polly = useAws ? new PollyClient({ region }) : null;
const ddbDoc = useAws ? DynamoDBDocumentClient.from(new DynamoDBClient({ region })) : null;
let cachedManualText = '';
let cachedManualRaw = '';
let manualLoadPromise = null;

app.use(cors());
app.use(express.json());

const termList = ['observe', 'deter', 'report', 'arrest', 'search', 'seizure', 'reasonable grounds', 'incident report', 'notebook'];

const mockTranslate = (text, language) => {
  const terms = termList.filter((term) => text.toLowerCase().includes(term));
  const preserved = terms.length > 0 ? ` Key terms: ${terms.join(', ')}.` : '';
  return `[${language}] ${text}${preserved}`;
};

const buildFeedback = ({ choice, scenario, step }) => {
  const result = choice.isCorrect ? 'Lower-risk choice.' : 'Risky choice.';
  const safeOrRisky =
    choice.isCorrect
      ? 'You stayed closer to legal limits, safety practice, and professionalism.'
      : 'This can increase legal exposure, safety danger, or professional complaints.';
  return [
    `Decision result: ${result}`,
    `Why this is safe or risky: ${safeOrRisky}`,
    `Better action: ${choice.manualFeedback}`,
    `Manual connection: ${step.manualPrinciple || scenario.manualTopic}`,
    'One exam tip: Choose actions that protect safety, follow procedure, and document objective facts.',
  ].join(' ');
};

const buildBedrockPrompt = ({ scenarioText, choiceText, consequence, manualPrinciple, riskScores }) => `
You are a security guard training coach.
The learner is practicing a visual simulation based on the Alberta Basic Security Training manual.

Use simple English. Be supportive but direct.
Do not invent new laws or facts.
Keep response under 160 words.

Scenario: ${scenarioText}
Student choice: ${choiceText}
Consequence: ${consequence}
Manual principle: ${manualPrinciple}
Risk scores:
- Legal Risk: ${riskScores.legalRisk}
- Safety Risk: ${riskScores.safetyRisk}
- Professionalism: ${riskScores.professionalism}
- Situation Control: ${riskScores.situationControl}
- Documentation: ${riskScores.documentationReadiness}

Write:
1) Why this choice is safe or risky
2) Better action
3) What learner should remember for exam
4) One short simple-English explanation
`;

const getAwsFeedback = async (payload) => {
  if (!bedrock) return null;
  try {
    const response = await bedrock.send(
      new ConverseCommand({
        modelId: bedrockModelId,
        messages: [{ role: 'user', content: [{ text: buildBedrockPrompt(payload) }] }],
      }),
    );
    const text = response.output?.message?.content?.[0]?.text;
    return text || null;
  } catch (error) {
    return null;
  }
};

const buildCoachFallback = (question) => {
  const lower = String(question || '').toLowerCase();
  if (lower.includes('observe') || lower.includes('deter') || lower.includes('report')) {
    return 'Observe means watch and gather facts. Deter means use professional presence and clear instructions to reduce risk. Report means document what happened and notify the right people.';
  }
  if (lower.includes('trespass')) {
    return 'For trespassing, first ask the person to leave if safe. If they refuse, call police and continue observing from a safe distance. Record what you saw and what actions you took.';
  }
  if (lower.includes('note') || lower.includes('report') || lower.includes('documentation')) {
    return 'Good notes are factual and objective: include date, time, location, people involved, observed behavior, actions taken, and who you notified.';
  }
  return 'Security practice tip: focus on safety, legal limits, clear communication, and objective documentation. Ask me about trespassing, escalation, or note writing for specific guidance.';
};

const buildSimpleEnglishQuestion = (question) => {
  const trimmed = String(question || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return 'You are asking for help with a security concept.';
  if (trimmed.length <= 90) return `Simple meaning: You want to understand "${trimmed}" in easy English.`;
  return `Simple meaning: You want an easy-English explanation about this security topic: "${trimmed.slice(0, 90)}..."`;
};

const glossaryRules = [
  {
    aliases: ['trespassing', 'thresspassing', 'tresspassing', 'trespass'],
    simpleEnglish: 'Trespassing: person who is entering an area they should not enter.',
    englishAnswer:
      'Trespassing means a person enters private property or a restricted area without permission. A guard should direct them to leave, observe safely, and report.',
    translations: {
      Hindi: 'अतिक्रमण करना - वह व्यक्ति जो किसी ऐसे क्षेत्र में प्रवेश कर रहा है जहाँ उसे प्रवेश नहीं करना चाहिए',
      Persian: 'تجاوزگر - شخصی که وارد منطقه ای می شود که نباید وارد شود',
    },
  },
  {
    aliases: ['immediately', 'immediatly', 'immediate'],
    simpleEnglish: 'Immediately means doing something without delay, instantly, or with no intervening time',
    englishAnswer: 'Immediately means doing something without delay, instantly, or with no intervening time',
    translations: {
      Persian: 'فوراً به معنای انجام کاری بدون تأخیر، فوراً یا بدون هیچ فاصله زمانی است',
    },
  },
];

const getGlossaryMatch = (question) => {
  const normalized = String(question || '').toLowerCase().replace(/[^a-z]/g, '');
  return glossaryRules.find((rule) => rule.aliases.some((alias) => normalized.includes(alias)));
};

const getAwsCoachAnswer = async (question) => {
  if (!bedrock) return null;
  try {
    const manualContext = await getManualContext(question);
    const prompt = `You are a security training coach for Alberta Basic Security Training learners.
Explain concepts in simple English.
Keep answer under 140 words.
Do not invent laws or facts.
Use only the manual context provided.
If context is missing, say the information is not available in provided manual extract.
Manual context:
${manualContext || 'Manual context unavailable.'}

Question: ${question}`;
    const response = await bedrock.send(
      new ConverseCommand({
        modelId: bedrockModelId,
        messages: [{ role: 'user', content: [{ text: prompt }] }],
      }),
    );
    return response.output?.message?.content?.[0]?.text || null;
  } catch (error) {
    return null;
  }
};

const languageCodeMap = {
  English: 'en',
  Arabic: 'ar',
  Hindi: 'hi',
  Punjabi: 'pa',
  Urdu: 'ur',
  Tagalog: 'tl',
  Spanish: 'es',
  Persian: 'fa',
};

const streamToBuffer = async (audioStream) => {
  if (!audioStream) return null;
  if (typeof audioStream.transformToByteArray === 'function') {
    const byteArray = await audioStream.transformToByteArray();
    return Buffer.from(byteArray);
  }
  if (audioStream instanceof Uint8Array) return Buffer.from(audioStream);
  if (Buffer.isBuffer(audioStream)) return audioStream;
  return null;
};

const ensureManualLoaded = async () => {
  if (cachedManualText) return cachedManualText;
  if (manualLoadPromise) return manualLoadPromise;
  manualLoadPromise = fs
    .readFile(manualPdfPath)
    .then(async (buffer) => {
      const parser = new pdfParse.PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      return result;
    })
    .then((result) => {
      cachedManualRaw = String(result.text || '');
      cachedManualText = cachedManualRaw
        .replace(/\s+/g, ' ')
        .trim();
      return cachedManualText;
    })
    .catch(() => '');
  return manualLoadPromise;
};

const ensureManualRawLoaded = async () => {
  await ensureManualLoaded();
  return cachedManualRaw;
};

const getManualContext = async (question) => {
  const text = await ensureManualLoaded();
  if (!text) return '';
  const keywords = String(question || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
  if (keywords.length === 0) return text.slice(0, 1400);

  const windows = [];
  const lower = text.toLowerCase();
  keywords.forEach((keyword) => {
    let index = lower.indexOf(keyword);
    let scans = 0;
    while (index !== -1 && scans < 4) {
      const start = Math.max(0, index - 280);
      const end = Math.min(text.length, index + 380);
      windows.push(text.slice(start, end));
      index = lower.indexOf(keyword, index + keyword.length);
      scans += 1;
    }
  });

  return [...new Set(windows)].join('\n---\n').slice(0, 2200);
};

const fallbackPostTestQuestions = [
  {
    id: 'm1-q1',
    module: 'Module 1',
    question: 'What is the primary role of a security professional?',
    options: ['Punish offenders', 'Observe, deter, and report', 'Replace police', 'Search all suspicious people'],
    answerIndex: 1,
  },
  {
    id: 'm2-q1',
    module: 'Module 2',
    question: 'When a trespasser refuses to leave after lawful direction, what is the best next step?',
    options: ['Use immediate force', 'Call police and continue safe observation', 'Ignore behavior', 'Leave post'],
    answerIndex: 1,
  },
  {
    id: 'm3-q1',
    module: 'Module 3',
    question: 'Professional communication during conflict should be:',
    options: ['Aggressive and loud', 'Calm, clear, and respectful', 'Silent and dismissive', 'Threat-based'],
    answerIndex: 1,
  },
  {
    id: 'm4-q1',
    module: 'Module 4',
    question: 'Good incident notes should contain:',
    options: ['Personal opinions only', 'Date, time, location, observed facts, actions taken', 'Only suspect name', 'No details if police arrive'],
    answerIndex: 1,
  },
  {
    id: 'm5-q1',
    module: 'Module 5',
    question: 'When speaking to media, a guard should:',
    options: ['Share private details off record', 'Refer to authorized spokesperson', 'Guess if unsure', 'Refuse all communication rudely'],
    answerIndex: 1,
  },
  {
    id: 'm6-q1',
    module: 'Module 6',
    question: 'During an alarm/emergency event, the guard should:',
    options: ['Disable alarm immediately', 'Follow emergency procedure and report', 'Ignore until manager arrives', 'Leave site immediately'],
    answerIndex: 1,
  },
];

const extractModuleBlocks = (rawText) => {
  const text = String(rawText || '').replace(/\r/g, '\n');
  const matches = [...text.matchAll(/module\s+(\d{1,2})/gi)];
  if (matches.length === 0) return [];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index < matches.length - 1 ? matches[index + 1].index ?? text.length : text.length;
    return { module: `Module ${match[1]}`, content: text.slice(start, end) };
  });
};

const extractAnswerMap = (rawText) => {
  const text = String(rawText || '').replace(/\r/g, '\n');
  const answerStart = text.toLowerCase().indexOf('answers to post-test');
  if (answerStart === -1) return {};
  const tail = text.slice(answerStart);
  const blocks = extractModuleBlocks(tail);
  const map = {};
  blocks.forEach((block) => {
    const answers = {};
    const pairs = [...block.content.matchAll(/(\d{1,2})\s*[\.\)]?\s*([A-D])/gi)];
    pairs.forEach((pair) => {
      answers[Number(pair[1])] = pair[2].toUpperCase();
    });
    map[block.module] = answers;
  });
  return map;
};

const extractPostTestQuestions = async () => {
  const rawText = await ensureManualRawLoaded();
  if (!rawText) return { source: 'fallback', questions: fallbackPostTestQuestions };
  const blocks = extractModuleBlocks(rawText);
  const answerMapByModule = extractAnswerMap(rawText);
  const questions = [];

  blocks.forEach((block) => {
    const marker = block.content.toLowerCase().indexOf('post-test');
    if (marker === -1) return;
    const postSection = block.content.slice(marker, marker + 12000);
    const questionMatches = [
      ...postSection.matchAll(/(?:^|\n)\s*(\d{1,2})\s*[\.\)]\s+(.{15,220}\?)([\s\S]*?)(?=(?:\n\s*\d{1,2}\s*[\.\)]\s+.{10,220}\?)|$)/gm),
    ];

    questionMatches.slice(0, 4).forEach((match) => {
      const questionNo = Number(match[1]);
      const questionText = match[2].replace(/\s+/g, ' ').trim();
      const optionText = match[3];
      const optionMatches = [...optionText.matchAll(/([A-D])\s*[\.\)]\s+([^\n]{3,180})/g)];
      if (optionMatches.length < 2) return;
      const options = optionMatches.map((item) => item[2].replace(/\s+/g, ' ').trim()).slice(0, 4);
      const answerLetter = answerMapByModule[block.module]?.[questionNo];
      const answerIndex = answerLetter ? ['A', 'B', 'C', 'D'].indexOf(answerLetter) : 0;
      questions.push({
        id: `${block.module.replace(/\s+/g, '-').toLowerCase()}-q${questionNo}`,
        module: block.module,
        question: questionText,
        options,
        answerIndex: answerIndex >= 0 ? answerIndex : 0,
      });
    });
  });

  if (questions.length < 5) {
    return { source: 'fallback', questions: fallbackPostTestQuestions };
  }
  return { source: 'pdf-post-test', questions: questions.slice(0, 12) };
};

app.get('/api/missions', (_req, res) => {
  res.json(missions);
});

app.get('/api/missions/:missionId', (req, res) => {
  const mission = missions.find((item) => item.missionId === req.params.missionId);
  if (!mission) {
    res.status(404).json({ message: 'Mission not found' });
    return;
  }
  res.json(mission);
});

app.post('/api/missions/:missionId/decision', async (req, res) => {
  const { sceneId, choiceId } = req.body;
  const mission = missions.find((item) => item.missionId === req.params.missionId);
  if (!mission) {
    res.status(404).json({ message: 'Mission not found' });
    return;
  }
  const scene = mission.scenes.find((item) => item.sceneId === sceneId);
  if (!scene) {
    res.status(404).json({ message: 'Scene not found' });
    return;
  }
  const choice = scene.choices?.find((item) => item.choiceId === choiceId);
  if (!choice) {
    res.status(404).json({ message: 'Choice not found' });
    return;
  }

  const fallbackFeedback = buildFeedback({ choice, scenario: mission, step: scene });
  const awsFeedback = await getAwsFeedback({
    scenarioText: scene.narration,
    choiceText: choice.text,
    consequence: choice.consequence,
    manualPrinciple: scene.manualPrinciple ?? mission.manualTopic,
    riskScores: choice.riskScores,
  });

  res.json({
    isCorrect: choice.isCorrect,
    riskScores: choice.riskScores,
    consequence: choice.consequence,
    feedback: awsFeedback || fallbackFeedback,
    manualConnection: scene.manualPrinciple ?? mission.manualTopic,
    nextSceneId: choice.nextScene ?? null,
  });
});

app.post('/api/feedback', async (req, res) => {
  const { scenarioText = '', choiceText = '', consequence = '', manualPrinciple = '', riskScores = {} } = req.body;
  const fallbackFeedback = [
    `Scenario: ${scenarioText}`,
    `Choice: ${choiceText}`,
    `Consequence: ${consequence}`,
    `Manual principle: ${manualPrinciple}`,
    'Remember for exam: choose actions that keep distance, preserve safety, and document facts.',
  ].join(' ');
  const awsFeedback = await getAwsFeedback({
    scenarioText,
    choiceText,
    consequence,
    manualPrinciple,
    riskScores: {
      legalRisk: Number(riskScores.legalRisk || 0),
      safetyRisk: Number(riskScores.safetyRisk || 0),
      professionalism: Number(riskScores.professionalism || 0),
      situationControl: Number(riskScores.situationControl || 0),
      documentationReadiness: Number(riskScores.documentation || 0),
    },
  });
  res.json({ feedback: awsFeedback || fallbackFeedback });
});

app.post('/api/translate', async (req, res) => {
  const { text = '', language = 'English' } = req.body;
  if (useAws && translate && language !== 'English') {
    try {
      const response = await translate.send(
        new TranslateTextCommand({
          Text: text,
          SourceLanguageCode: 'en',
          TargetLanguageCode: languageCodeMap[language] || 'en',
        }),
      );
      const translatedText = response.TranslatedText || text;
      res.json({ translatedText: `${translatedText}\n\n(keep terms: observe, report, police, legal risk)` });
      return;
    } catch (error) {
      // fallback below
    }
  }
  res.json({ translatedText: mockTranslate(text, language) });
});

app.post('/api/audio', async (req, res) => {
  const { text = '' } = req.body;
  if (useAws && polly && text) {
    try {
      const response = await polly.send(
        new SynthesizeSpeechCommand({
          OutputFormat: 'mp3',
          Text: text,
          VoiceId: pollyVoiceId,
          Engine: 'neural',
        }),
      );
      const buffer = await streamToBuffer(response.AudioStream);
      if (buffer) {
        const base64 = buffer.toString('base64');
        res.json({ audioUrl: `data:audio/mpeg;base64,${base64}` });
        return;
      }
    } catch (error) {
      // fallback below
    }
  }
  // Fallback: frontend browser speech synthesis.
  res.json({ audioUrl: null });
});

app.post('/api/chat', async (req, res) => {
  const question = String(req.body.question || '').trim();
  const language = String(req.body.language || 'English');
  if (!question) {
    res.status(400).json({ message: 'Question is required.' });
    return;
  }
  const glossaryMatch = getGlossaryMatch(question);
  const manualContext = await getManualContext(question);
  const awsAnswer = glossaryMatch ? null : await getAwsCoachAnswer(question);
  const fallback = glossaryMatch
    ? glossaryMatch.englishAnswer
    : manualContext
      ? `Manual reference: ${manualContext.slice(0, 520)}...`
      : buildCoachFallback(question);
  const englishAnswer = awsAnswer || fallback;
  const simpleEnglishQuestion = glossaryMatch ? glossaryMatch.simpleEnglish : buildSimpleEnglishQuestion(question);

  if (language !== 'English') {
    const glossaryTranslation = glossaryMatch?.translations?.[language];
    if (glossaryTranslation) {
      res.json({ answer: glossaryTranslation, simpleEnglishQuestion, englishAnswer, translatedAnswer: glossaryTranslation });
      return;
    }
    if (useAws && translate) {
      try {
        const response = await translate.send(
          new TranslateTextCommand({
            Text: englishAnswer,
            SourceLanguageCode: 'en',
            TargetLanguageCode: languageCodeMap[language] || 'en',
          }),
        );
        const translated = response.TranslatedText || englishAnswer;
        res.json({ answer: translated, simpleEnglishQuestion, englishAnswer, translatedAnswer: translated });
        return;
      } catch (error) {
        // fallback below
      }
    }

    const translated = mockTranslate(englishAnswer, language);
    res.json({ answer: translated, simpleEnglishQuestion, englishAnswer, translatedAnswer: translated });
    return;
  }

  res.json({ answer: englishAnswer, simpleEnglishQuestion, englishAnswer, translatedAnswer: null });
});

app.get('/api/post-test-quiz', async (_req, res) => {
  const payload = await extractPostTestQuestions();
  res.json(payload);
});

app.post('/api/mission-result', async (req, res) => {
  const payload = {
    ...req.body,
    completedAt: new Date().toISOString(),
    attemptId: `${req.body.missionId}-${Date.now()}`,
  };
  const key = `${payload.studentId}:${payload.attemptId}`;
  progressStore.set(key, payload);

  if (useAws && ddbDoc) {
    try {
      await ddbDoc.send(
        new PutCommand({
          TableName: tableName,
          Item: payload,
        }),
      );
    } catch (error) {
      // fallback already stored in-memory
    }
  }

  res.json({ ok: true, attemptId: payload.attemptId });
});

app.get('/api/progress/:studentId', async (req, res) => {
  if (useAws && ddbDoc) {
    try {
      const response = await ddbDoc.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'studentId = :studentId',
          ExpressionAttributeValues: {
            ':studentId': req.params.studentId,
          },
        }),
      );
      res.json(response.Items || []);
      return;
    } catch (error) {
      // fallback below
    }
  }

  const results = [...progressStore.values()].filter((item) => item.studentId === req.params.studentId);
  res.json(results);
});

app.post('/api/report-feedback', (req, res) => {
  const report = String(req.body.studentReport || '').trim();
  const checks = {
    hasDate: /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/.test(report),
    hasTime: /\b\d{1,2}:\d{2}\b/.test(report),
    hasLocation: /\b(lobby|desk|entrance|floor|building|store)\b/i.test(report),
    hasActions: /\b(notified|reported|called|observed|documented|requested)\b/i.test(report),
  };
  res.json({
    good: 'Clear attempt to document an incident in objective language.',
    missing: Object.entries(checks)
      .filter(([, value]) => !value)
      .map(([key]) => key),
    improvedVersion:
      '2026-04-25 10:30, front desk lobby: Visitor raised voice after denied access. I remained calm, repeated access policy, requested supervisor support, and notified building manager.',
  });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`GuardSim API running on http://localhost:${port}`);
});
