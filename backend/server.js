import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { missions } from './missions.js';

const app = express();
const port = Number(process.env.PORT || 8787);
const progressStore = new Map();
const useAws = process.env.USE_AWS === 'true';
const region = process.env.AWS_REGION || 'ca-central-1';
const tableName = process.env.GUARDSIM_PROGRESS_TABLE || 'GuardSimProgress';
const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';
const pollyVoiceId = process.env.POLLY_VOICE_ID || 'Joanna';

const bedrock = useAws ? new BedrockRuntimeClient({ region }) : null;
const translate = useAws ? new TranslateClient({ region }) : null;
const polly = useAws ? new PollyClient({ region }) : null;
const ddbDoc = useAws ? DynamoDBDocumentClient.from(new DynamoDBClient({ region })) : null;

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

const languageCodeMap = {
  English: 'en',
  Arabic: 'ar',
  Hindi: 'hi',
  Punjabi: 'pa',
  Urdu: 'ur',
  Tagalog: 'tl',
  Spanish: 'es',
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
