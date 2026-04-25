export type LanguageOption = 'English' | 'Arabic' | 'Hindi' | 'Punjabi' | 'Urdu' | 'Tagalog' | 'Spanish';

export type CameraNodeKey = 'securityPost' | 'fenceLine' | 'trailerArea' | 'policeArrival';

export interface HudScores {
  legalRisk: number;
  safetyRisk: number;
  professionalism: number;
  situationControl: number;
  documentation: number;
}

export interface MissionChoice {
  id: string;
  text: string;
  isCorrect: boolean;
  consequence: string;
  scoreDelta: HudScores;
  feedback: string;
  nextStepId: string;
  nextCameraNode: CameraNodeKey;
}

export interface MissionStep {
  id: string;
  cameraNode: CameraNodeKey;
  sceneState: 'patrol' | 'trespasser-loitering' | 'trespasser-refuses' | 'vandalism' | 'police-arrived';
  narration: string;
  dialogue: string;
  question: string;
  manualPrinciple: string;
  choices: MissionChoice[];
}

export interface Mission {
  id: string;
  title: string;
  manualTopic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedTime: string;
  intro: string;
  startStepId: string;
  steps: Record<string, MissionStep>;
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
