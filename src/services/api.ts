import type { DecisionResponse, LanguageOption, Mission, MissionResult } from '../types';

interface DecisionRequest {
  studentId: string;
  missionId: string;
  sceneId: string;
  choiceId: string;
  language: LanguageOption;
}

const headers = { 'Content-Type': 'application/json' };

export const api = {
  async getMissions(): Promise<Mission[]> {
    const response = await fetch('/api/missions');
    return response.json();
  },

  async submitDecision(payload: DecisionRequest): Promise<DecisionResponse> {
    const response = await fetch(`/api/missions/${payload.missionId}/decision`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  async translateFeedback(text: string, language: LanguageOption): Promise<string> {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, language }),
    });
    const data = await response.json();
    return data.translatedText as string;
  },

  async generateAudio(text: string): Promise<string | null> {
    const response = await fetch('/api/audio', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    return (data.audioUrl as string) || null;
  },

  async saveProgress(studentId: string, missionId: string, result: MissionResult, choices: string[], language: LanguageOption): Promise<void> {
    await fetch('/api/mission-result', {
      method: 'POST',
      headers,
      body: JSON.stringify({ studentId, missionId, language, choices, result }),
    });
  },
};
