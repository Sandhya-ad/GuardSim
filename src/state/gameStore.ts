import { create } from 'zustand';
import { constructionSiteMission } from '../data/missions/constructionSiteMission';
import type { CameraNodeKey, HudScores, LanguageOption, MissionChoice } from '../types';

type Screen = 'landing' | 'language' | 'missions' | 'objectives' | 'controls' | 'game' | 'consequence' | 'summary' | 'coach' | 'quiz';

const startingHud: HudScores = {
  legalRisk: 0,
  safetyRisk: 0,
  professionalism: 100,
  situationControl: 80,
  documentation: 0,
};

interface GameStore {
  currentScreen: Screen;
  selectedLanguage: LanguageOption;
  mission: typeof constructionSiteMission;
  currentStepId: string;
  currentCameraNode: CameraNodeKey;
  hud: HudScores;
  scoreHistory: HudScores[];
  choicesMade: MissionChoice[];
  feedback: string;
  translatedFeedback: string;
  missionComplete: boolean;
  interactions: {
    patrolComplete: boolean;
    barrierMoved: boolean;
    barrierInZone: boolean;
    radioUsed: boolean;
    notesTaken: boolean;
    notesCompleted: boolean;
    trespasserChecked: boolean;
    policeEtaSeconds: number | null;
    notebookOpen: boolean;
    noteFields: {
      time: boolean;
      location: boolean;
      action: boolean;
    };
  };
  setScreen: (screen: Screen) => void;
  setLanguage: (language: LanguageOption) => void;
  startMission: () => void;
  applyDecision: (decision: MissionChoice, feedback: string) => void;
  setTranslatedFeedback: (text: string) => void;
  continueMission: () => void;
  resetMission: () => void;
  replayFromStep: (stepId: string) => void;
  markInteraction: (key: 'patrolComplete' | 'barrierMoved' | 'radioUsed' | 'notesTaken' | 'trespasserChecked') => void;
  setBarrierInZone: (inZone: boolean) => void;
  startPoliceEta: () => void;
  tickPoliceEta: () => void;
  openNotebook: () => void;
  toggleNoteField: (field: 'time' | 'location' | 'action') => void;
  completeNotebook: () => void;
}

const applyDelta = (hud: HudScores, delta: HudScores): HudScores => ({
  legalRisk: Math.max(0, Math.min(100, hud.legalRisk + delta.legalRisk)),
  safetyRisk: Math.max(0, Math.min(100, hud.safetyRisk + delta.safetyRisk)),
  professionalism: Math.max(0, Math.min(100, hud.professionalism + delta.professionalism)),
  situationControl: Math.max(0, Math.min(100, hud.situationControl + delta.situationControl)),
  documentation: Math.max(0, Math.min(100, hud.documentation + delta.documentation)),
});

export const useGameStore = create<GameStore>((set, get) => ({
  currentScreen: 'landing',
  selectedLanguage: 'English',
  mission: constructionSiteMission,
  currentStepId: constructionSiteMission.startStepId,
  currentCameraNode: 'securityPost',
  hud: startingHud,
  scoreHistory: [],
  choicesMade: [],
  feedback: '',
  translatedFeedback: '',
  missionComplete: false,
  interactions: {
    patrolComplete: false,
    barrierMoved: false,
    barrierInZone: false,
    radioUsed: false,
    notesTaken: false,
    notesCompleted: false,
    trespasserChecked: false,
    policeEtaSeconds: null,
    notebookOpen: false,
    noteFields: {
      time: false,
      location: false,
      action: false,
    },
  },
  setScreen: (screen) => set({ currentScreen: screen }),
  setLanguage: (language) => set({ selectedLanguage: language }),
  startMission: () =>
    set({
      currentScreen: 'game',
      currentStepId: constructionSiteMission.startStepId,
      currentCameraNode: 'securityPost',
      hud: startingHud,
      scoreHistory: [],
      choicesMade: [],
      feedback: '',
      translatedFeedback: '',
      missionComplete: false,
      interactions: {
        patrolComplete: false,
        barrierMoved: false,
        barrierInZone: false,
        radioUsed: false,
        notesTaken: false,
        notesCompleted: false,
        trespasserChecked: false,
        policeEtaSeconds: null,
        notebookOpen: false,
        noteFields: {
          time: false,
          location: false,
          action: false,
        },
      },
    }),
  applyDecision: (decision, feedback) => {
    const state = get();
    const updatedHud = applyDelta(state.hud, decision.scoreDelta);
    set({
      currentStepId: decision.nextStepId,
      currentCameraNode: decision.nextCameraNode,
      hud: updatedHud,
      scoreHistory: [...state.scoreHistory, updatedHud],
      choicesMade: [...state.choicesMade, decision],
      feedback,
      translatedFeedback: '',
      missionComplete: decision.nextStepId === 'mission-complete',
      currentScreen: 'consequence',
      interactions: {
        patrolComplete: false,
        barrierMoved: false,
        barrierInZone: false,
        radioUsed: false,
        notesTaken: false,
        notesCompleted: false,
        trespasserChecked: false,
        policeEtaSeconds: null,
        notebookOpen: false,
        noteFields: {
          time: false,
          location: false,
          action: false,
        },
      },
    });
  },
  setTranslatedFeedback: (text) => set({ translatedFeedback: text }),
  continueMission: () => {
    const state = get();
    set({ currentScreen: state.missionComplete ? 'summary' : 'game' });
  },
  resetMission: () =>
    set({
      currentStepId: constructionSiteMission.startStepId,
      currentCameraNode: 'securityPost',
      hud: startingHud,
      scoreHistory: [],
      choicesMade: [],
      feedback: '',
      translatedFeedback: '',
      missionComplete: false,
      interactions: {
        patrolComplete: false,
        barrierMoved: false,
        barrierInZone: false,
        radioUsed: false,
        notesTaken: false,
        notesCompleted: false,
        trespasserChecked: false,
        policeEtaSeconds: null,
        notebookOpen: false,
        noteFields: {
          time: false,
          location: false,
          action: false,
        },
      },
      currentScreen: 'missions',
    }),
  replayFromStep: (stepId) => {
    const state = get();
    const target = state.mission.steps[stepId];
    if (!target) return;
    set({
      currentScreen: 'game',
      currentStepId: stepId,
      currentCameraNode: target.cameraNode,
      feedback: '',
      translatedFeedback: '',
      missionComplete: false,
      interactions: {
        patrolComplete: false,
        barrierMoved: false,
        barrierInZone: false,
        radioUsed: false,
        notesTaken: false,
        notesCompleted: false,
        trespasserChecked: false,
        policeEtaSeconds: null,
        notebookOpen: false,
        noteFields: {
          time: false,
          location: false,
          action: false,
        },
      },
    });
  },
  markInteraction: (key) =>
    set((state) => ({
      interactions: {
        ...state.interactions,
        [key]: true,
      },
    })),
  setBarrierInZone: (inZone) =>
    set((state) => ({
      interactions: {
        ...state.interactions,
        barrierInZone: inZone,
      },
    })),
  startPoliceEta: () =>
    set((state) => ({
      interactions: {
        ...state.interactions,
        radioUsed: true,
        policeEtaSeconds: state.interactions.policeEtaSeconds ?? 25,
      },
    })),
  tickPoliceEta: () =>
    set((state) => ({
      interactions: {
        ...state.interactions,
        policeEtaSeconds:
          state.interactions.policeEtaSeconds === null
            ? null
            : Math.max(0, state.interactions.policeEtaSeconds - 1),
      },
    })),
  openNotebook: () =>
    set((state) => ({
      interactions: {
        ...state.interactions,
        notebookOpen: true,
      },
    })),
  toggleNoteField: (field) =>
    set((state) => ({
      interactions: {
        ...state.interactions,
        noteFields: {
          ...state.interactions.noteFields,
          [field]: !state.interactions.noteFields[field],
        },
      },
    })),
  completeNotebook: () =>
    set((state) => {
      const done =
        state.interactions.noteFields.time &&
        state.interactions.noteFields.location &&
        state.interactions.noteFields.action;
      return {
        interactions: {
          ...state.interactions,
          notesTaken: done ? true : state.interactions.notesTaken,
          notesCompleted: done ? true : state.interactions.notesCompleted,
          notebookOpen: done ? false : state.interactions.notebookOpen,
        },
      };
    }),
}));
