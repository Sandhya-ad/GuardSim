import type { HudScores, LanguageOption, MissionResult, PostTestQuestion } from '../types';

const headers = { 'Content-Type': 'application/json' };
const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const buildApiUrl = (path: string) => `${apiBase}${path}`;

export const api = {
  async generateFeedback(payload: {
    scenarioText: string;
    choiceText: string;
    consequence: string;
    manualPrinciple: string;
    riskScores: HudScores;
  }): Promise<string> {
    const response = await fetch(buildApiUrl('/api/feedback'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return (data.feedback as string) || '';
  },

  async translateFeedback(text: string, language: LanguageOption): Promise<string> {
    const response = await fetch(buildApiUrl('/api/translate'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, language }),
    });
    const data = await response.json();
    return data.translatedText as string;
  },

  async generateAudio(text: string): Promise<string | null> {
    const response = await fetch(buildApiUrl('/api/audio'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    return (data.audioUrl as string) || null;
  },

  async saveProgress(studentId: string, missionId: string, result: MissionResult, choices: string[], language: LanguageOption): Promise<void> {
    await fetch(buildApiUrl('/api/mission-result'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ studentId, missionId, language, choices, result }),
    });
  },

  async chatWithCoach(
    question: string,
    language: LanguageOption,
  ): Promise<{ simpleEnglishQuestion: string; englishAnswer: string; translatedAnswer: string | null }> {
    const response = await fetch(buildApiUrl('/api/chat'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, language }),
    });
    const data = await response.json();
    return {
      simpleEnglishQuestion:
        (data.simpleEnglishQuestion as string) ||
        'You are asking for a simpler explanation about a security concept.',
      englishAnswer: (data.englishAnswer as string) || (data.answer as string) || 'No response available.',
      translatedAnswer: (data.translatedAnswer as string) || null,
    };
  },

  async getPostTestQuiz(): Promise<{ questions: PostTestQuestion[]; source: string }> {
    const response = await fetch(buildApiUrl('/api/post-test-quiz'));
    const data = await response.json();
    return {
      questions: (data.questions as PostTestQuestion[]) || [],
      source: (data.source as string) || 'fallback',
    };
  },
};
