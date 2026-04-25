import { useEffect, useMemo, useState } from 'react';
import { GuardSimScene } from './game/GuardSimScene';
import { api } from './services/api';
import { useGameStore } from './state/gameStore';
import { calculateMissionResult } from './utils/scoring';
import type { LanguageOption } from './types';

const languages: LanguageOption[] = ['English', 'Arabic', 'Hindi', 'Punjabi', 'Urdu', 'Tagalog', 'Spanish'];
const studentId = 'demo-user';
const sceneTitles = {
  patrol: 'Guided patrol',
  'trespasser-loitering': 'Unauthorized entry detected',
  'trespasser-refuses': 'Subject refuses lawful direction',
  vandalism: 'Property damage in progress',
  'police-arrived': 'Police scene handoff',
} as const;
const shortStatus = {
  patrol: 'Walk patrol path to gate marker',
  'trespasser-loitering': 'Person inside site',
  'trespasser-refuses': 'Person will not leave',
  vandalism: 'Person breaking window',
  'police-arrived': 'Police now on scene',
} as const;
const roleIcons = {
  trespasser: 'Person',
  radio: 'Call police',
  notebook: 'Write notes',
} as const;

const firstSentence = (input: string) => {
  const split = input.split(/[.!?]/).find((part) => part.trim().length > 0);
  return split ? `${split.trim()}.` : input;
};

function App() {
  const currentScreen = useGameStore((s) => s.currentScreen);
  const setScreen = useGameStore((s) => s.setScreen);
  const selectedLanguage = useGameStore((s) => s.selectedLanguage);
  const setLanguage = useGameStore((s) => s.setLanguage);
  const mission = useGameStore((s) => s.mission);
  const currentStepId = useGameStore((s) => s.currentStepId);
  const hud = useGameStore((s) => s.hud);
  const choicesMade = useGameStore((s) => s.choicesMade);
  const feedback = useGameStore((s) => s.feedback);
  const translatedFeedback = useGameStore((s) => s.translatedFeedback);
  const scoreHistory = useGameStore((s) => s.scoreHistory);
  const missionComplete = useGameStore((s) => s.missionComplete);
  const startMission = useGameStore((s) => s.startMission);
  const applyDecision = useGameStore((s) => s.applyDecision);
  const continueMission = useGameStore((s) => s.continueMission);
  const setTranslatedFeedback = useGameStore((s) => s.setTranslatedFeedback);
  const resetMission = useGameStore((s) => s.resetMission);
  const replayFromStep = useGameStore((s) => s.replayFromStep);
  const tickPoliceEta = useGameStore((s) => s.tickPoliceEta);
  const toggleNoteField = useGameStore((s) => s.toggleNoteField);
  const completeNotebook = useGameStore((s) => s.completeNotebook);
  const interactions = useGameStore((s) => s.interactions);
  const [busy, setBusy] = useState(false);
  const currentStep = mission.steps[currentStepId];

  const result = useMemo(() => calculateMissionResult(scoreHistory), [scoreHistory]);
  const stepNeeds = useMemo(() => {
    if (!currentStep) return [];
    if (currentStep.id === 'step-0-patrol') return ['Use WASD to move guard to blue marker'];
    if (currentStep.id === 'step-1') return ['Move barrier to yellow circle', 'Tap person'];
    if (currentStep.id === 'step-2-refuses') return ['Tap radio'];
    if (currentStep.id === 'step-3-vandalism') return ['Tap person', 'Tap radio'];
    if (currentStep.id === 'step-4-documentation') return ['Tap notes', 'Fill time + location + action'];
    return [];
  }, [currentStep]);
  const isStepReady = useMemo(() => {
    if (!currentStep) return false;
    if (currentStep.id === 'step-0-patrol') return interactions.patrolComplete;
    if (currentStep.id === 'step-1') return interactions.barrierInZone && interactions.trespasserChecked;
    if (currentStep.id === 'step-2-refuses') return interactions.radioUsed;
    if (currentStep.id === 'step-3-vandalism') return interactions.radioUsed && interactions.trespasserChecked;
    if (currentStep.id === 'step-4-documentation') return interactions.notesCompleted;
    return true;
  }, [currentStep, interactions]);

  useEffect(() => {
    if (currentScreen !== 'game') return;
    if (interactions.policeEtaSeconds === null || interactions.policeEtaSeconds <= 0) return;
    const timer = window.setInterval(() => {
      tickPoliceEta();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentScreen, interactions.policeEtaSeconds, tickPoliceEta]);

  const submitChoice = async (choiceId: string) => {
    if (!currentStep) return;
    const choice = currentStep.choices.find((item) => item.id === choiceId);
    if (!choice) return;
    setBusy(true);
    const generated = await api
      .generateFeedback({
        scenarioText: currentStep.narration,
        choiceText: choice.text,
        consequence: choice.consequence,
        manualPrinciple: currentStep.manualPrinciple,
        riskScores: choice.scoreDelta,
      })
      .catch(() => '');
    applyDecision(choice, generated || choice.feedback);
    setBusy(false);
  };

  const translateFeedback = async () => {
    if (selectedLanguage === 'English' || !feedback) return;
    const translated = await api.translateFeedback(feedback, selectedLanguage);
    setTranslatedFeedback(translated);
  };

  const listenFeedback = async () => {
    if (!feedback) return;
    const audioUrl = await api.generateAudio(feedback);
    if (audioUrl) {
      await new Audio(audioUrl).play();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(feedback);
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const continueFlow = async () => {
    if (missionComplete) {
      await api.saveProgress(
        studentId,
        mission.id,
        result,
        choicesMade.map((item) => item.id),
        selectedLanguage,
      );
    }
    continueMission();
  };

  return (
    <div className="layout app-bg">
      <header className="header">
        <h1>GuardSim 3D</h1>
        <p>Construction Site Trespass Simulator</p>
      </header>

      {currentScreen === 'landing' && (
        <section className="card center">
          <h2>Trespassing Response Training</h2>
          <p>You are a security guard. Your job is to keep people safe and follow the law.</p>
          <button onClick={() => setScreen('language')}>Start Training</button>
        </section>
      )}

      {currentScreen === 'language' && (
        <section className="card">
          <h2>Choose language support</h2>
          <p>English is always shown first. Translation is optional support.</p>
          <div className="grid">{languages.map((item) => <button key={item} className={selectedLanguage === item ? 'selected' : ''} onClick={() => setLanguage(item)}>{item}</button>)}</div>
          <button onClick={() => setScreen('missions')}>Continue</button>
        </section>
      )}

      {currentScreen === 'missions' && (
        <section className="card">
          <h2>Module 2: Trespassing</h2>
          <article className="mission-card">
            <h3>{mission.title}</h3>
            <p>{mission.intro}</p>
            <button onClick={() => setScreen('objectives')}>Continue</button>
          </article>
        </section>
      )}

      {currentScreen === 'objectives' && (
        <section className="card">
          <h2>Training Objectives</h2>
          <article className="mission-card">
            <ul>
              <li>Identify a trespasser</li>
              <li>Communicate properly</li>
              <li>Know when to call police</li>
              <li>Know when NOT to use force</li>
              <li>Document the situation</li>
            </ul>
            <button onClick={() => setScreen('controls')}>Continue</button>
          </article>
        </section>
      )}

      {currentScreen === 'controls' && (
        <section className="card">
          <h2>Controls Tutorial</h2>
          <article className="mission-card">
            <p>Move: WASD or arrow keys</p>
            <p>Interact: click glowing dots</p>
            <p>Open notebook: click Notes dot</p>
            <p>Goal: follow guide steps, then choose action.</p>
            <button onClick={startMission}>Start Simulation</button>
          </article>
        </section>
      )}

      {currentScreen === 'game' && currentStep && (
        <section className="card">
          <div className="between"><h2>Mission: {mission.title}</h2><strong>{currentStep.id}</strong></div>
          <div className="hud-grid">
            {(Object.keys(hud) as (keyof typeof hud)[]).map((key) => (
              <div key={key}>
                <div className="between"><span>{key}</span><span>{hud[key]}%</span></div>
                <progress max={100} value={hud[key]} />
                <small>{key.includes('Risk') ? 'Lower is better' : 'Higher is better'}</small>
              </div>
            ))}
          </div>

          <GuardSimScene />
          <div className="sim-console">
            <div className="sim-status">
              <span className="status-dot" />
              <strong>{sceneTitles[currentStep.sceneState]}</strong>
            </div>
            <p>{shortStatus[currentStep.sceneState]}</p>
            {currentStep.sceneState === 'patrol' && <p className="subtitle-line">Guide: Walk and observe gate, signs, and dark corners first.</p>}
            {currentStep.sceneState !== 'patrol' && <p className="subtitle-line">{currentStep.dialogue}</p>}
          </div>
          <div className="icon-legend">
            <span>Orange dot: {roleIcons.trespasser}</span>
            <span>Blue dot: {roleIcons.radio}</span>
            <span>White dot: {roleIcons.notebook}</span>
          </div>
          {stepNeeds.length > 0 && (
            <div className="task-chip">
              Do first: {stepNeeds.join(' + ')}
            </div>
          )}
          {interactions.policeEtaSeconds !== null && (
            <div className="eta-chip">
              Police ETA: {interactions.policeEtaSeconds}s
            </div>
          )}
          {interactions.notebookOpen && (
            <div className="notebook-panel">
              <h4>Notebook</h4>
              <p>Select all 3:</p>
              <div className="row">
                <button className={interactions.noteFields.time ? 'selected' : ''} onClick={() => toggleNoteField('time')}>
                  Time
                </button>
                <button className={interactions.noteFields.location ? 'selected' : ''} onClick={() => toggleNoteField('location')}>
                  Location
                </button>
                <button className={interactions.noteFields.action ? 'selected' : ''} onClick={() => toggleNoteField('action')}>
                  Action
                </button>
              </div>
              <button onClick={completeNotebook}>Save Notes</button>
            </div>
          )}
          <h3>Choose action</h3>
          <div className="choices action-grid">
            {currentStep.choices.map((choice) => (
              <button key={choice.id} onClick={() => submitChoice(choice.id)} disabled={busy || !isStepReady}>
                <span className="action-label">Action {choice.id}</span>
                {firstSentence(choice.text)}
              </button>
            ))}
          </div>
        </section>
      )}

      {currentScreen === 'consequence' && choicesMade.length > 0 && (
        <section className="card">
          <h2>Result</h2>
          <p>You chose: <strong>{choicesMade.at(-1)?.id}</strong></p>
          <p className={choicesMade.at(-1)?.isCorrect ? 'good' : 'risk'}>{firstSentence(choicesMade.at(-1)?.consequence || '')}</p>
          <p>{firstSentence(feedback)}</p>
          <div className="row">
            {selectedLanguage !== 'English' && <button onClick={translateFeedback}>Explain in {selectedLanguage}</button>}
            <button onClick={listenFeedback}>Listen</button>
            <button onClick={continueFlow}>Continue</button>
          </div>
          {translatedFeedback && <p className="translation">{translatedFeedback}</p>}
        </section>
      )}

      {currentScreen === 'summary' && (
        <section className="card">
          <h2>Mission Complete: {mission.title}</h2>
          <p className="score">Overall Readiness: {result.overallReadiness}%</p>
          <div className="score-grid">
            <p>Legal Judgment: {result.legalScore}%</p>
            <p>Safety Awareness: {result.safetyScore}%</p>
            <p>Professionalism: {result.professionalismScore}%</p>
            <p>Situation Control: {result.situationControlScore}%</p>
            <p>Documentation: {result.documentationScore}%</p>
          </div>
          <h3>Decisions Made</h3>
          <p>{choicesMade.map((item) => item.id).join(' -> ') || 'No decisions recorded.'}</p>
          <h3>Recommended Review</h3>
          <ul>{(result.weakTopics.length > 0 ? result.weakTopics : ['Strong performance. Keep practicing for consistency.']).map((topic) => <li key={topic}>{topic}</li>)}</ul>
          <h3>Replay Scenarios</h3>
          <div className="row">
            <button onClick={() => replayFromStep('step-1')}>Replay: First Contact</button>
            <button onClick={() => replayFromStep('step-2-refuses')}>Replay: Refusal</button>
            <button onClick={() => replayFromStep('step-3-vandalism')}>Replay: Escalation</button>
            <button onClick={() => replayFromStep('step-4-documentation')}>Replay: Notes</button>
          </div>
          <div className="row">
            <button onClick={startMission}>Retry Mission</button>
            <button onClick={resetMission}>Back to Mission Select</button>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
