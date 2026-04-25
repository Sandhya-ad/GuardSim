import { useEffect, useMemo, useState } from 'react';
import { GuardSimScene } from './game/GuardSimScene';
import { api } from './services/api';
import { useGameStore } from './state/gameStore';
import { calculateMissionResult } from './utils/scoring';
import type { LanguageOption, PostTestQuestion } from './types';

const languages: LanguageOption[] = ['English', 'Arabic', 'Hindi', 'Punjabi', 'Urdu', 'Tagalog', 'Spanish', 'Persian'];
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
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachInput, setCoachInput] = useState('');
  const [coachQuestionSimple, setCoachQuestionSimple] = useState('');
  const [coachAnswerEnglish, setCoachAnswerEnglish] = useState('');
  const [coachAnswerTranslated, setCoachAnswerTranslated] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSource, setQuizSource] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<PostTestQuestion[]>([]);
  const [quizSelections, setQuizSelections] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
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

  const askCoach = async (prompt?: string) => {
    const question = (prompt ?? coachInput).trim();
    if (!question) return;
    setCoachLoading(true);
    const answer = await api
      .chatWithCoach(question, selectedLanguage)
      .catch(() => ({
        simpleEnglishQuestion: 'Your question asks for a security concept explanation in simple words.',
        englishAnswer: 'Coach is unavailable right now. Please try again.',
        translatedAnswer: null,
      }));
    setCoachQuestionSimple(answer.simpleEnglishQuestion);
    setCoachAnswerEnglish(answer.englishAnswer);
    setCoachAnswerTranslated(answer.translatedAnswer || '');
    setCoachLoading(false);
  };

  const copyText = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // ignore clipboard errors silently
    }
  };

  const startPostTest = async () => {
    setQuizLoading(true);
    const payload = await api.getPostTestQuiz().catch(() => ({ questions: [], source: 'fallback' }));
    setQuizQuestions(payload.questions);
    setQuizSource(payload.source);
    setQuizSelections({});
    setQuizSubmitted(false);
    setQuizLoading(false);
    setScreen('quiz');
  };

  const scoreQuiz = useMemo(() => {
    if (quizQuestions.length === 0) return { correct: 0, total: 0, percent: 0 };
    const correct = quizQuestions.reduce((sum, question) => (quizSelections[question.id] === question.answerIndex ? sum + 1 : sum), 0);
    const total = quizQuestions.length;
    return { correct, total, percent: Math.round((correct / total) * 100) };
  }, [quizQuestions, quizSelections]);

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
            <button onClick={startPostTest} disabled={quizLoading}>
              {quizLoading ? 'Loading Post-Test...' : 'Start Post-Test Quiz'}
            </button>
          </div>
        </section>
      )}

      {currentScreen === 'quiz' && (
        <section className="card">
          <div className="between">
            <h2>Post-Test Quiz</h2>
            <button onClick={() => setScreen('summary')}>Back to Summary</button>
          </div>
          <p>Questions are generated from POST-TEST content in your uploaded manual. Source: <strong>{quizSource || 'loading'}</strong></p>
          {quizQuestions.length === 0 && <p>No quiz questions found yet. Try again after PDF context loads.</p>}
          {quizQuestions.map((question, index) => (
            <article key={question.id} className="quiz-card">
              <p><strong>Q{index + 1} ({question.module}):</strong> {question.question}</p>
              <div className="choices">
                {question.options.map((option, optionIndex) => (
                  <button
                    key={`${question.id}-${optionIndex}`}
                    className={quizSelections[question.id] === optionIndex ? 'selected' : ''}
                    onClick={() => setQuizSelections((prev) => ({ ...prev, [question.id]: optionIndex }))}
                  >
                    {String.fromCharCode(65 + optionIndex)}. {option}
                  </button>
                ))}
              </div>
              {quizSubmitted && (
                <p className={quizSelections[question.id] === question.answerIndex ? 'good' : 'risk'}>
                  {quizSelections[question.id] === question.answerIndex ? 'Correct' : 'Incorrect'} | Answer: {String.fromCharCode(65 + question.answerIndex)}
                </p>
              )}
            </article>
          ))}
          {quizQuestions.length > 0 && (
            <div className="row two-col">
              <button onClick={() => setQuizSubmitted(true)}>Submit Quiz</button>
              <button
                onClick={() => {
                  setQuizSelections({});
                  setQuizSubmitted(false);
                }}
              >
                Reset Answers
              </button>
            </div>
          )}
          {quizSubmitted && (
            <p className="score">
              Quiz Score: {scoreQuiz.correct}/{scoreQuiz.total} ({scoreQuiz.percent}%)
            </p>
          )}
        </section>
      )}

      <button
        className="coach-fab"
        onClick={() => setCoachOpen((open) => !open)}
        aria-label="Open security coach chatbot"
        title="Security Coach"
      >
        💬
      </button>
      {coachOpen && (
        <aside className="coach-drawer">
          <div className="between">
            <h3>Security Coach</h3>
            <button className="ghost-btn" onClick={() => setCoachOpen(false)}>Close</button>
          </div>
          <p className="coach-sub">Ask concepts from the Alberta security manual.</p>
          <div className="coach-shell">
            <label htmlFor="coachQuestion">Ask a question</label>
            <textarea
              id="coachQuestion"
              value={coachInput}
              onChange={(event) => setCoachInput(event.target.value)}
              placeholder="Example: Explain legal risk vs safety risk in security work."
              rows={4}
            />
            <div className="row two-col">
              <button onClick={() => askCoach()} disabled={coachLoading}>
                {coachLoading ? 'Thinking...' : 'Ask Coach'}
              </button>
              <button
                onClick={() => {
                  setCoachInput('');
                  setCoachQuestionSimple('');
                  setCoachAnswerEnglish('');
                  setCoachAnswerTranslated('');
                }}
              >
                Clear
              </button>
            </div>
            <div className="coach-answer">
              <div className="between">
                <strong>Your Question (Simple English)</strong>
                <button className="ghost-btn" onClick={() => copyText(coachQuestionSimple)} disabled={!coachQuestionSimple}>
                  Copy
                </button>
              </div>
              <p>{coachQuestionSimple || 'Simple-English interpretation appears after you ask.'}</p>
              <div className="between">
                <strong>Coach Answer (English)</strong>
                <button className="ghost-btn" onClick={() => copyText(coachAnswerEnglish)} disabled={!coachAnswerEnglish}>
                  Copy
                </button>
              </div>
              <p>{coachAnswerEnglish || 'Ask a concept question to begin.'}</p>
              {selectedLanguage !== 'English' && (
                <>
                  <div className="between">
                    <strong>Coach Answer ({selectedLanguage})</strong>
                    <button className="ghost-btn" onClick={() => copyText(coachAnswerTranslated)} disabled={!coachAnswerTranslated}>
                      Copy
                    </button>
                  </div>
                  <p>{coachAnswerTranslated || 'Translation will appear here after reply.'}</p>
                </>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

export default App;
