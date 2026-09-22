import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { addCompletedRound, defaultState } from './data/state'
import { cloudSyncConfigured } from './data/supabase'
import { mergeCloudHistory, pullCloudRounds, pushCompletedRounds, type SyncStatus } from './data/sync'
import { generateRound } from './game/facts'
import { gameReducer, initialGameState } from './game/reducer'
import { getAchievements, rankRounds } from './game/records'
import type {
  Attempt,
  Difficulty,
  RecordAchievements,
  RoundResult,
} from './game/types'
import styles from './App.module.css'

const DIFFICULTY_INFO: Record<
  Difficulty,
  { label: string; subtitle: string; description: string; accent: string }
> = {
  easy: { label: 'Easy', subtitle: '1 · 2 · 5 · 10', description: 'Build your launch streak', accent: 'cyan' },
  medium: { label: 'Medium', subtitle: '3 · 4 · 6 · 7 · 8 · 9', description: 'Enter the power zone', accent: 'violet' },
  expert: {
    label: 'Expert',
    subtitle: '3 · 4 · 6 · 7 · 8 · 9 · 11 · 12',
    description: 'Take on the full arena',
    accent: 'orange',
  },
}

const NO_ACHIEVEMENTS: RecordAchievements = {
  bestScore: false,
  perfectTime: false,
  qualifiedTime: false,
}

function formatTime(milliseconds: number | null, tenths = false): string {
  if (milliseconds === null) return '—'
  const totalSeconds = milliseconds / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds - minutes * 60
  if (minutes > 0) return `${minutes}:${Math.floor(seconds).toString().padStart(2, '0')}`
  return tenths ? `${seconds.toFixed(1)}s` : `${Math.floor(seconds)}s`
}

function playTone(kind: 'correct' | 'incorrect' | 'complete', enabled: boolean) {
  if (!enabled || !('AudioContext' in window)) return
  try {
    const context = new AudioContext()
    const notes = kind === 'complete' ? [523, 659, 784] : [kind === 'correct' ? 660 : 180]
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = context.currentTime + index * 0.09
      oscillator.type = kind === 'incorrect' ? 'triangle' : 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.1, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.18)
    })
    window.setTimeout(() => void context.close(), 700)
  } catch {
    // Audio is optional and must never interrupt play.
  }
}

function SoundButton({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      className={styles.soundButton}
      type="button"
      onClick={onToggle}
      aria-label={enabled ? 'Mute sound effects' : 'Enable sound effects'}
      aria-pressed={enabled}
    >
      <span aria-hidden="true">{enabled ? '♪' : '×'}</span>
      {enabled ? 'Sound on' : 'Sound off'}
    </button>
  )
}

function SyncIndicator({ status }: { status: SyncStatus }) {
  const labels: Record<SyncStatus, string> = {
    local: cloudSyncConfigured ? 'Preparing shared sync…' : 'Playing locally',
    offline: 'Sync paused — offline',
    syncing: 'Syncing shared progress…',
    synced: 'Shared progress synced',
    error: 'Sync will retry later',
  }
  return <span className={styles.syncLabel} aria-live="polite">{labels[status]}</span>
}

function Records({ rounds, syncStatus }: { rounds: RoundResult[]; syncStatus: SyncStatus }) {
  return (
    <section className={styles.recordsPanel} aria-labelledby="records-title">
      <div className={styles.recordsHeading}>
        <div>
          <div className={styles.sectionEyebrow}>Personal bests &amp; rankings</div>
          <h2 id="records-title">Your records</h2>
        </div>
        <SyncIndicator status={syncStatus} />
      </div>
      <div className={styles.recordGrid}>
        {(Object.keys(DIFFICULTY_INFO) as Difficulty[]).map((difficulty) => {
          const ranked = rankRounds(rounds, difficulty)
          const best = ranked[0]
          return (
            <article key={difficulty} className={styles.recordCard}>
              <h3>{DIFFICULTY_INFO[difficulty].label}</h3>
              <div className={styles.personalBest}>
                <span>Personal best</span>
                <strong>{best ? `${best.percentage}% · ${formatTime(best.activeTimeMs, true)}` : 'No rounds yet'}</strong>
              </div>
              <div className={styles.rankingHeader} aria-hidden="true">
                <span>Rank</span><span>Score</span><span>Time</span>
              </div>
              {ranked.length > 0 ? (
                <ol className={styles.rankingList} aria-label={`${DIFFICULTY_INFO[difficulty].label} top ten`}>
                  {ranked.map((round, index) => (
                    <li key={round.id}>
                      <span className={styles.rankNumber}>{index + 1}</span>
                      <strong>{round.percentage}%</strong>
                      <span>{formatTime(round.activeTimeMs, true)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.emptyRanking}>Complete a round to claim the first spot.</p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function HomeScreen({
  rounds,
  syncStatus,
  onStart,
}: {
  rounds: RoundResult[]
  syncStatus: SyncStatus
  onStart: (difficulty: Difficulty) => void
}) {
  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.logoMark} aria-hidden="true"><span>×</span></div>
        <p className={styles.kicker}>Math Quest</p>
        <h1>Multiplication<br /><span>Arena</span></h1>
        <p className={styles.heroCopy}>Pick your level. Answer 25 facts. Beat your best.</p>
      </section>

      <section className={styles.modeSection} aria-labelledby="choose-mode">
        <div className={styles.sectionEyebrow}>Choose your challenge</div>
        <h2 id="choose-mode">Ready, player?</h2>
        <div className={styles.modeGrid}>
          {(Object.keys(DIFFICULTY_INFO) as Difficulty[]).map((difficulty, index) => {
            const info = DIFFICULTY_INFO[difficulty]
            return (
              <button
                type="button"
                key={difficulty}
                className={`${styles.modeCard} ${styles[info.accent]}`}
                onClick={() => onStart(difficulty)}
              >
                <span className={styles.modeNumber}>0{index + 1}</span>
                <span className={styles.modeLabel}>{info.label}</span>
                <span className={styles.modeSubtitle}>{info.subtitle}</span>
                <span className={styles.modeDescription}>{info.description}</span>
                <span className={styles.playLabel}>Play now <span aria-hidden="true">→</span></span>
              </button>
            )
          })}
        </div>
      </section>
      <Records rounds={rounds} syncStatus={syncStatus} />
    </main>
  )
}

function Confetti() {
  return (
    <div className={styles.confetti} aria-hidden="true">
      {Array.from({ length: 20 }, (_, index) => (
        <i key={index} />
      ))}
    </div>
  )
}

function ResultScreen({
  result,
  achievements,
  bestStreak,
  onReplay,
  onHome,
}: {
  result: RoundResult
  achievements: RecordAchievements
  bestStreak: number
  onReplay: () => void
  onHome: () => void
}) {
  const isPerfect = result.correctAnswers === result.totalQuestions
  const isNewRecord = Object.values(achievements).some(Boolean)
  const heading = isPerfect ? 'Perfect round!' : result.percentage >= 90 ? 'Arena cleared!' : 'Round complete!'
  return (
    <main className={styles.results}>
      {(isPerfect || isNewRecord) && <Confetti />}
      <section className={styles.resultCard}>
        <p className={styles.kicker}>{DIFFICULTY_INFO[result.difficulty].label} arena</p>
        <h1>{heading}</h1>
        {isNewRecord && <div className={styles.recordBanner}>★ New personal best</div>}
        <div className={styles.scoreRing} aria-label={`${result.correctAnswers} correct out of ${result.totalQuestions}`}>
          <strong>{result.correctAnswers}</strong><span>/ {result.totalQuestions}</span>
          <small>{result.percentage}%</small>
        </div>
        <div className={styles.resultStats}>
          <div><span>Total time</span><strong>{formatTime(result.activeTimeMs, true)}</strong></div>
          <div><span>Per question</span><strong>{formatTime(result.averageTimeMs, true)}</strong></div>
          <div><span>Best streak</span><strong>{bestStreak} 🔥</strong></div>
        </div>
        <div className={styles.resultActions}>
          <button className={styles.primaryButton} type="button" onClick={onReplay}>Play again</button>
          <button className={styles.secondaryButton} type="button" onClick={onHome}>Choose a level</button>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  const [game, dispatch] = useReducer(gameReducer, initialGameState)
  const [persisted, setPersisted] = useState(defaultState)
  const [answer, setAnswer] = useState('')
  const [validation, setValidation] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [displayTime, setDisplayTime] = useState(0)
  const [achievements, setAchievements] = useState<RecordAchievements>(NO_ACHIEVEMENTS)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local')
  const inputRef = useRef<HTMLInputElement>(null)
  const resumeButtonRef = useRef<HTMLButtonElement>(null)
  const pausedFocusRef = useRef<HTMLElement | null>(null)
  const questionStartRef = useRef(0)
  const questionElapsedRef = useRef(0)
  const persistedResultRef = useRef<string | null>(null)
  const persistedRef = useRef(persisted)
  const syncInFlightRef = useRef<Promise<void> | null>(null)

  const soundEnabled = persisted.settings.soundEnabled
  const currentQuestion = game.questions[game.questionIndex]
  const completedTime = useMemo(
    () => game.attempts.reduce((sum, attempt) => sum + attempt.responseTimeMs, 0),
    [game.attempts],
  )
  const roundFingerprint = useMemo(() => persisted.rounds.map((round) => round.id).join(','), [persisted.rounds])

  useEffect(() => {
    persistedRef.current = persisted
  }, [persisted])

  const syncNow = useCallback(async () => {
    if (!cloudSyncConfigured) return
    if (syncInFlightRef.current) return syncInFlightRef.current
    if (!navigator.onLine) {
      setSyncStatus('offline')
      return
    }
    setSyncStatus('syncing')
    const run = (async () => {
      try {
        const cloudRounds = await pullCloudRounds()
        const merged = mergeCloudHistory(persistedRef.current, cloudRounds)
        persistedRef.current = merged
        setPersisted(merged)
        setSyncStatus('synced')
      } catch {
        // Rounds are already safely stored on this device; the next online event
        // or completed round retries the idempotent upload.
        setSyncStatus('error')
      } finally {
        syncInFlightRef.current = null
      }
    })()
    syncInFlightRef.current = run
    return run
  }, [])

  useEffect(() => {
    if (!cloudSyncConfigured) return
    const online = () => void syncNow()
    const offline = () => setSyncStatus('offline')
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [syncNow])

  useEffect(() => {
    if (cloudSyncConfigured) void syncNow()
  }, [syncNow])

  useEffect(() => {
    if (roundFingerprint) void syncNow()
  }, [roundFingerprint, syncNow])

  const startRound = useCallback((difficulty: Difficulty) => {
    setAchievements(NO_ACHIEVEMENTS)
    persistedResultRef.current = null
    dispatch({ type: 'START', difficulty, questions: generateRound(difficulty) })
  }, [])

  const resume = useCallback(() => {
    questionStartRef.current = performance.now()
    setIsPaused(false)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  useEffect(() => {
    if (game.phase !== 'playing') return
    setAnswer('')
    setValidation('')
    setIsPaused(false)
    questionElapsedRef.current = 0
    questionStartRef.current = performance.now()
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [game.phase, game.questionIndex])

  useEffect(() => {
    if (game.phase !== 'playing' || isPaused) return
    const update = () => setDisplayTime(completedTime + questionElapsedRef.current + performance.now() - questionStartRef.current)
    update()
    const interval = window.setInterval(update, 100)
    return () => window.clearInterval(interval)
  }, [completedTime, game.phase, isPaused])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && game.phase === 'playing' && !isPaused) {
        questionElapsedRef.current += performance.now() - questionStartRef.current
        setIsPaused(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [game.phase, isPaused])

  useEffect(() => {
    if (!isPaused) return
    pausedFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusTimer = window.setTimeout(() => resumeButtonRef.current?.focus(), 0)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        resume()
        return
      }
      if (event.key !== 'Tab') return
      const dialog = document.getElementById('pause-dialog')
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isPaused, resume])

  useEffect(() => {
    if (isPaused || game.phase !== 'playing') return
    const focusTarget = pausedFocusRef.current
    if (focusTarget && document.contains(focusTarget)) {
      window.setTimeout(() => focusTarget.focus(), 0)
      pausedFocusRef.current = null
    }
  }, [game.phase, isPaused])

  useEffect(() => {
    if (game.phase !== 'feedback' || !game.lastAttempt) return
    const delay = game.lastAttempt.isCorrect ? 450 : 2200
    const timeout = window.setTimeout(() => dispatch({ type: 'ADVANCE' }), delay)
    return () => window.clearTimeout(timeout)
  }, [game.lastAttempt, game.phase])

  useEffect(() => {
    if (game.phase !== 'results' || !game.result || persistedResultRef.current === game.result.id) return
    persistedResultRef.current = game.result.id
    const nextAchievements = getAchievements(game.result, persisted.records)
    const nextPersisted = addCompletedRound(persisted, game.result)
    setAchievements(nextAchievements)
    setPersisted(nextPersisted)
    if (cloudSyncConfigured) {
      void pushCompletedRounds([game.result])
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'))
    }
    playTone('complete', soundEnabled)
  }, [game.phase, game.result, persisted, soundEnabled])

  const submitAnswer = (event: React.FormEvent) => {
    event.preventDefault()
    if (game.phase !== 'playing' || isPaused || !currentQuestion) return
    const normalizedAnswer = answer.trim()
    if (!/^\d{1,3}$/.test(normalizedAnswer)) {
      setValidation('Type a whole-number answer first.')
      inputRef.current?.focus()
      return
    }
    const responseTimeMs = Math.max(
      0,
      Math.round(questionElapsedRef.current + performance.now() - questionStartRef.current),
    )
    const enteredAnswer = Number(normalizedAnswer)
    const attempt: Attempt = {
      questionId: currentQuestion.id,
      factX: currentQuestion.fact.x,
      factY: currentQuestion.fact.y,
      displayedX: currentQuestion.displayedX,
      displayedY: currentQuestion.displayedY,
      enteredAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect: enteredAnswer === currentQuestion.correctAnswer,
      responseTimeMs,
    }
    setDisplayTime(completedTime + responseTimeMs)
    playTone(attempt.isCorrect ? 'correct' : 'incorrect', soundEnabled)
    dispatch({ type: 'SUBMIT', attempt })
  }

  const toggleSound = () => {
    const next = { ...persisted, settings: { soundEnabled: !soundEnabled } }
    setPersisted(next)
  }

  return (
    <div className={styles.appShell}>
      <div className={styles.backgroundGrid} aria-hidden="true" />
      <header className={styles.topBar}>
        <button className={styles.brand} type="button" onClick={() => dispatch({ type: 'HOME' })}>
          <span aria-hidden="true">×</span> Math Quest
        </button>
        <div className={styles.topActions}>
          <SoundButton enabled={soundEnabled} onToggle={toggleSound} />
        </div>
      </header>

      {game.phase === 'home' && (
        <HomeScreen rounds={persisted.rounds} syncStatus={syncStatus} onStart={startRound} />
      )}

      {(game.phase === 'playing' || game.phase === 'feedback') && currentQuestion && (
        <main className={styles.game}>
          <section className={styles.gamePanel} aria-label="Multiplication round">
            <div className={styles.hud}>
              <div><span>Question</span><strong>{game.questionIndex + 1}<small>/25</small></strong></div>
              <div className={styles.streak}><span>Streak</span><strong>{game.streak} <small>🔥</small></strong></div>
              <div><span>Time</span><strong>{formatTime(displayTime, true)}</strong></div>
            </div>
            <progress
              className={styles.progressTrack}
              aria-label={`Question ${game.questionIndex + 1} of ${game.questions.length}`}
              value={game.questionIndex + (game.phase === 'feedback' ? 1 : 0)}
              max={game.questions.length}
            />
            <p className={styles.srOnly} aria-live="polite">
              Question {game.questionIndex + 1} of {game.questions.length}
            </p>

            <div className={styles.questionArea}>
              <p className={styles.arenaLabel}>{DIFFICULTY_INFO[game.difficulty!].label} arena</p>
              <div className={styles.equation} aria-label={`${currentQuestion.displayedX} times ${currentQuestion.displayedY}`}>
                <span>{currentQuestion.displayedX}</span><b>×</b><span>{currentQuestion.displayedY}</span>
              </div>

              {game.phase === 'playing' ? (
                <form className={styles.answerForm} onSubmit={submitAnswer} noValidate>
                  <label htmlFor="answer">Your answer</label>
                  <input
                    ref={inputRef}
                    id="answer"
                    value={answer}
                    onChange={(event) => {
                      setAnswer(event.target.value.slice(0, 12))
                      setValidation('')
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    aria-describedby={validation ? 'answer-error' : undefined}
                    aria-invalid={Boolean(validation)}
                  />
                  <button className={styles.primaryButton} type="submit">Lock it in <span aria-hidden="true">↵</span></button>
                  <p id="answer-error" className={styles.validation} role="alert">{validation}</p>
                </form>
              ) : (
                <div
                  className={`${styles.feedback} ${game.lastAttempt?.isCorrect ? styles.correct : styles.incorrect}`}
                  role="status"
                  aria-live="polite"
                >
                  <strong>{game.lastAttempt?.isCorrect ? 'Yes!' : 'Not quite!'}</strong>
                  <span>
                    {game.lastAttempt?.isCorrect
                      ? `${currentQuestion.correctAnswer} is right`
                      : `You answered ${game.lastAttempt?.enteredAnswer}`}
                  </span>
                  {!game.lastAttempt?.isCorrect && (
                    <span className={styles.correctAnswer}>
                      Correct answer: {currentQuestion.displayedX} × {currentQuestion.displayedY} = {currentQuestion.correctAnswer}
                    </span>
                  )}
                  {game.lastAttempt?.isCorrect && <div className={styles.spark} aria-hidden="true" />}
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {game.phase === 'results' && game.result && (
        <ResultScreen
          result={game.result}
          achievements={achievements}
          bestStreak={game.bestStreak}
          onReplay={() => startRound(game.result!.difficulty)}
          onHome={() => dispatch({ type: 'HOME' })}
        />
      )}

      {isPaused && (
        <div id="pause-dialog" className={styles.pauseOverlay} role="dialog" aria-modal="true" aria-labelledby="pause-title" aria-describedby="pause-description">
          <div>
            <span aria-hidden="true">Ⅱ</span>
            <h2 id="pause-title">Game paused</h2>
            <p id="pause-description">Your timer is stopped. Press Escape or resume when you’re ready.</p>
            <button ref={resumeButtonRef} className={styles.primaryButton} type="button" onClick={resume}>Resume round</button>
          </div>
        </div>
      )}
    </div>
  )
}
