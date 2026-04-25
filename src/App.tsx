import { useEffect, useMemo, useState } from 'react';
import { MissionCanvas } from './components/MissionCanvas';
import { api } from './services/api';
import { calculateMissionResult } from './utils/scoring';
import type { HudScores, LanguageOption, Mission, MissionChoice, MissionResult, MissionScene } from './types';

type AppScreen = 'landing' | 'language' | 'missions' | 'game' | 'consequence' | 'summary';
const languages: LanguageOption[] = ['English', 'Arabic', 'Hindi', 'Punjabi', 'Urdu', 'Tagalog', 'Spanish'];
const studentId = 'demo-user';

const defaultHud: HudScores = { legalRisk: 0, safetyRisk: 0, professionalism: 60, situationControl: 55, documentationReadiness: 40 };
const hints = {
  legalRisk: 'Lower is better',
  safetyRisk: 'Lower is better',
  professionalism: 'Higher is better',
  situationControl: 'Higher is better',
  documentationReadiness: 'Higher is better',
} as const;

function App() {
  const [screen, setScreen] = useState<AppScreen>('landing');
  const [language, setLanguage] = useState<LanguageOption>('English');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [sceneId, setSceneId] = useState<string>('');
  const [history, setHistory] = useState<HudScores[]>([]);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [lastChoice, setLastChoice] = useState<MissionChoice | null>(null);
  const [feedback, setFeedback] = useState('');
  const [translatedFeedback, setTranslatedFeedback] = useState('');
  const [result, setResult] = useState<MissionResult | null>(null);
  const [nextSceneId, setNextSceneId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getMissions().then(setMissions).catch(() => setMissions([]));
  }, []);

  const activeScene: MissionScene | null = useMemo(() => {
    if (!activeMission) return null;
    return activeMission.scenes.find((scene) => scene.sceneId === sceneId) ?? null;
  }, [activeMission, sceneId]);

  const hud = useMemo(() => {
    if (history.length === 0) return defaultHud;
    const total = history.length;
    const sums = history.reduce(
      (acc, item) => ({
        legalRisk: acc.legalRisk + item.legalRisk,
        safetyRisk: acc.safetyRisk + item.safetyRisk,
        professionalism: acc.professionalism + item.professionalism,
        situationControl: acc.situationControl + item.situationControl,
        documentationReadiness: acc.documentationReadiness + item.documentationReadiness,
      }),
      { legalRisk: 0, safetyRisk: 0, professionalism: 0, situationControl: 0, documentationReadiness: 0 },
    );
    return {
      legalRisk: Math.round(sums.legalRisk / total),
      safetyRisk: Math.round(sums.safetyRisk / total),
      professionalism: Math.round(sums.professionalism / total),
      situationControl: Math.round(sums.situationControl / total),
      documentationReadiness: Math.round(sums.documentationReadiness / total),
    };
  }, [history]);

  const beginMission = (mission: Mission) => {
    setActiveMission(mission);
    setSceneId(mission.startScene);
    setHistory([]);
    setSelectedChoices([]);
    setLastChoice(null);
    setFeedback('');
    setTranslatedFeedback('');
    setResult(null);
    setNextSceneId(null);
    setScreen('game');
  };

  const onHotspotSelect = (next: string) => setSceneId(next);

  const submitChoice = async (choice: MissionChoice) => {
    if (!activeMission || !activeScene) return;
    setBusy(true);
    setLastChoice(choice);
    const response = await api.submitDecision({
      studentId,
      missionId: activeMission.missionId,
      sceneId: activeScene.sceneId,
      choiceId: choice.choiceId,
      language,
    });
    setHistory((prev) => [...prev, response.riskScores]);
    setSelectedChoices((prev) => [...prev, choice.choiceId]);
    setFeedback(response.feedback);
    setTranslatedFeedback('');
    setNextSceneId(response.nextSceneId);
    setBusy(false);
    setScreen('consequence');
  };

  const translateFeedback = async () => {
    if (language === 'English' || !feedback) return;
    const translated = await api.translateFeedback(feedback, language);
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

  const continueMission = async () => {
    if (!activeMission) return;
    if (!nextSceneId) {
      const missionResult = calculateMissionResult(history);
      setResult(missionResult);
      await api.saveProgress(studentId, activeMission.missionId, missionResult, selectedChoices, language);
      setScreen('summary');
      return;
    }
    setSceneId(nextSceneId);
    setScreen('game');
  };

  return (
    <div className="layout">
      <header className="header">
        <h1>GuardSim</h1>
        <p>Playable Security Officer Practical Simulator</p>
      </header>

      {screen === 'landing' && (
        <section className="card center">
          <h2>Read the manual. Practice the manual. Remember the manual.</h2>
          <p>Security guards do not work inside paragraphs. They work inside incidents.</p>
          <button onClick={() => setScreen('language')}>Start Training</button>
        </section>
      )}

      {screen === 'language' && (
        <section className="card">
          <h2>Choose language support</h2>
          <p>English is always shown first. Translation is optional support.</p>
          <div className="grid">{languages.map((item) => <button key={item} className={language === item ? 'selected' : ''} onClick={() => setLanguage(item)}>{item}</button>)}</div>
          <button onClick={() => setScreen('missions')}>Continue to Missions</button>
        </section>
      )}

      {screen === 'missions' && (
        <section className="card">
          <h2>Mission Selection</h2>
          <div className="mission-list">
            {missions.map((mission) => (
              <article key={mission.missionId} className="mission-card">
                <h3>{mission.title}</h3>
                <p>Topic: {mission.manualTopic}</p>
                <p>Skill: {mission.skills.join(', ')}</p>
                <p>Difficulty: {mission.difficulty} | ETA: {mission.estimatedTime}</p>
                <button onClick={() => beginMission(mission)}>Start Mission</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {screen === 'game' && activeMission && activeScene && (
        <section className="card">
          <div className="between"><h2>Mission: {activeMission.title}</h2><strong>{activeScene.sceneId}</strong></div>
          <div className="hud-grid">
            {(Object.keys(hud) as (keyof HudScores)[]).map((key) => (
              <div key={key}>
                <div className="between"><span>{key}</span><span>{hud[key]}%</span></div>
                <progress max={100} value={hud[key]} />
                <small>{hints[key]}</small>
              </div>
            ))}
          </div>

          <MissionCanvas scene={activeScene} onHotspotSelect={onHotspotSelect} />
          <p>{activeScene.narration}</p>
          {activeScene.dialogue && <blockquote>{activeScene.dialogue}</blockquote>}
          {activeScene.question && <h3>{activeScene.question}</h3>}

          {activeScene.hotspots && (
            <div className="choices">
              {activeScene.hotspots.map((hotspot) => (
                <button key={hotspot.id} onClick={() => onHotspotSelect(hotspot.nextScene)}>{hotspot.label}</button>
              ))}
            </div>
          )}

          {activeScene.choices && (
            <div className="choices">
              {activeScene.choices.map((choice) => (
                <button key={choice.choiceId} onClick={() => submitChoice(choice)} disabled={busy}>
                  {choice.choiceId}. {choice.text}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {screen === 'consequence' && activeScene && lastChoice && (
        <section className="card">
          <h2>Consequence</h2>
          <p>You chose: <strong>{lastChoice.choiceId}. {lastChoice.text}</strong></p>
          <p className={lastChoice.isCorrect ? 'good' : 'risk'}>{lastChoice.consequence}</p>
          <p>{feedback}</p>
          <aside className="manual"><h4>Manual Principle</h4><p>{activeScene.manualPrinciple}</p></aside>
          <div className="row">
            {language !== 'English' && <button onClick={translateFeedback}>Explain in {language}</button>}
            <button onClick={listenFeedback}>Listen</button>
            <button onClick={continueMission}>Continue</button>
          </div>
          {translatedFeedback && <p className="translation">{translatedFeedback}</p>}
        </section>
      )}

      {screen === 'summary' && activeMission && result && (
        <section className="card">
          <h2>Mission Complete: {activeMission.title}</h2>
          <p className="score">Overall Readiness: {result.overallReadiness}%</p>
          <div className="score-grid">
            <p>Legal Judgment: {result.legalScore}%</p>
            <p>Safety Awareness: {result.safetyScore}%</p>
            <p>Professionalism: {result.professionalismScore}%</p>
            <p>Situation Control: {result.situationControlScore}%</p>
            <p>Documentation: {result.documentationScore}%</p>
          </div>
          <h3>Decisions Made</h3>
          <p>{selectedChoices.join(' -> ') || 'No decisions recorded.'}</p>
          <h3>Recommended Review</h3>
          <ul>{(result.weakTopics.length > 0 ? result.weakTopics : ['Strong performance. Keep practicing for consistency.']).map((topic) => <li key={topic}>{topic}</li>)}</ul>
          <div className="row">
            <button onClick={() => beginMission(activeMission)}>Retry Mission</button>
            <button onClick={() => setScreen('missions')}>Next Mission</button>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
