export type LanguageOption =
  | 'English'
  | 'Arabic'
  | 'Hindi'
  | 'Punjabi'
  | 'Urdu'
  | 'Tagalog'
  | 'Spanish';

export interface HudScores {
  legalRisk: number;
  safetyRisk: number;
  professionalism: number;
  situationControl: number;
  documentationReadiness: number;
}

export interface MissionChoice {
  choiceId: string;
  text: string;
  isCorrect: boolean;
  nextScene: string | null;
  consequence: string;
  riskScores: HudScores;
  manualFeedback: string;
}

export interface SceneHotspot {
  id: string;
  label: string;
  nextScene: string;
}

export interface MissionScene {
  sceneId: string;
  background: string;
  narration: string;
  dialogue?: string;
  question?: string;
  manualPrinciple?: string;
  hotspots?: SceneHotspot[];
  choices?: MissionChoice[];
}

export interface Mission {
  missionId: string;
  title: string;
  manualTopic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedTime: string;
  skills: string[];
  startScene: string;
  scenes: MissionScene[];
}

export interface DecisionResponse {
  isCorrect: boolean;
  riskScores: HudScores;
  consequence: string;
  feedback: string;
  manualConnection: string;
  nextSceneId: string | null;
}

export interface MissionResult {
  overallReadiness: number;
  legalScore: number;
  safetyScore: number;
  professionalismScore: number;
  situationControlScore: number;
  documentationScore: number;
  weakTopics: string[];
}
