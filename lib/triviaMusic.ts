"use client";

const GAMEPLAY_TRACK_SRC = "/audio/trivia-gameplay.mp3";
const RESULTS_TRACK_SRC = "/audio/trivia-results.mp3";
const GAMEPLAY_VOLUME = 0.35;
const RESULTS_VOLUME = 0.42;
const FADE_DURATION_MS = 900;
const FADE_INTERVAL_MS = 40;
const TOGGLE_OFF_FADE_MS = 420;

let gameplayTrack: HTMLAudioElement | null = null;
let resultsTrack: HTMLAudioElement | null = null;
let fadeTimer: number | null = null;
let fadeToken = 0;

const canUseAudio = () => typeof window !== "undefined";

const getGameplayTrack = () => {
  if (!canUseAudio()) return null;
  if (!gameplayTrack) {
    gameplayTrack = new Audio(GAMEPLAY_TRACK_SRC);
    gameplayTrack.loop = true;
    gameplayTrack.preload = "auto";
    gameplayTrack.volume = GAMEPLAY_VOLUME;
  }
  return gameplayTrack;
};

const getResultsTrack = () => {
  if (!canUseAudio()) return null;
  if (!resultsTrack) {
    resultsTrack = new Audio(RESULTS_TRACK_SRC);
    resultsTrack.loop = true;
    resultsTrack.preload = "auto";
    resultsTrack.volume = RESULTS_VOLUME;
  }
  return resultsTrack;
};

const clearFadeTimer = () => {
  if (fadeTimer === null || !canUseAudio()) return;
  window.clearInterval(fadeTimer);
  fadeTimer = null;
};

const cancelFade = () => {
  fadeToken += 1;
  clearFadeTimer();
};

const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

const resolveBaseVolume = (track: HTMLAudioElement | null) => {
  if (!track) return 0;
  if (track === gameplayTrack) return GAMEPLAY_VOLUME;
  if (track === resultsTrack) return RESULTS_VOLUME;
  return 0.4;
};

const resetAndPause = (track: HTMLAudioElement | null) => {
  if (!track) return;
  track.pause();
  track.currentTime = 0;
};

export const fadeOutAndStopTriviaMusic = (durationMs = TOGGLE_OFF_FADE_MS) => {
  const gameplay = getGameplayTrack();
  const results = getResultsTrack();
  const activeTracks = [gameplay, results].filter((track): track is HTMLAudioElement => Boolean(track && !track.paused));

  if (!activeTracks.length) {
    stopTriviaMusic();
    return;
  }

  cancelFade();
  const tokenAtStart = fadeToken;
  const steps = Math.max(1, Math.round(durationMs / FADE_INTERVAL_MS));
  const starts = activeTracks.map((track) => ({ track, startVolume: track.volume }));
  let step = 0;

  fadeTimer = window.setInterval(() => {
    if (tokenAtStart !== fadeToken) {
      clearFadeTimer();
      return;
    }

    step += 1;
    const progress = Math.min(1, step / steps);
    starts.forEach(({ track, startVolume }) => {
      track.volume = clampVolume(startVolume * (1 - progress));
    });

    if (progress >= 1) {
      clearFadeTimer();
      starts.forEach(({ track }) => {
        track.pause();
        track.currentTime = 0;
      });
      if (gameplay) gameplay.volume = GAMEPLAY_VOLUME;
      if (results) results.volume = RESULTS_VOLUME;
    }
  }, FADE_INTERVAL_MS);
};

export const stopTriviaMusic = () => {
  cancelFade();
  resetAndPause(getGameplayTrack());
  resetAndPause(getResultsTrack());
  if (gameplayTrack) gameplayTrack.volume = GAMEPLAY_VOLUME;
  if (resultsTrack) resultsTrack.volume = RESULTS_VOLUME;
};

const playTrack = async (
  primary: HTMLAudioElement | null,
  secondary: HTMLAudioElement | null,
  primaryTargetVolume: number
) => {
  if (!primary) return;

  cancelFade();
  const tokenAtStart = fadeToken;

  const secondaryBaseVolume = resolveBaseVolume(secondary);
  const primaryStartVolume = primary.paused ? 0 : primary.volume;
  const secondaryStartVolume = secondary && !secondary.paused ? secondary.volume : 0;

  if (primary.paused) {
    primary.volume = 0;
    try {
      await primary.play();
    } catch {
      // Browser autoplay policies can block playback before user interaction.
      return;
    }
  }

  if (tokenAtStart !== fadeToken) {
    return;
  }

  const steps = Math.max(1, Math.round(FADE_DURATION_MS / FADE_INTERVAL_MS));
  let step = 0;

  fadeTimer = window.setInterval(() => {
    if (tokenAtStart !== fadeToken) {
      clearFadeTimer();
      return;
    }

    step += 1;
    const progress = Math.min(1, step / steps);
    const primaryVolume = primaryStartVolume + (primaryTargetVolume - primaryStartVolume) * progress;
    primary.volume = clampVolume(primaryVolume);

    if (secondary && !secondary.paused) {
      const secondaryVolume = secondaryStartVolume * (1 - progress);
      secondary.volume = clampVolume(secondaryVolume);
    }

    if (progress >= 1) {
      clearFadeTimer();
      if (secondary && !secondary.paused) {
        secondary.pause();
        secondary.currentTime = 0;
        secondary.volume = secondaryBaseVolume;
      }
      primary.volume = primaryTargetVolume;
    }
  }, FADE_INTERVAL_MS);
};

export const playTriviaGameplayMusic = async () => {
  await playTrack(getGameplayTrack(), getResultsTrack(), GAMEPLAY_VOLUME);
};

export const playTriviaResultsMusic = async () => {
  await playTrack(getResultsTrack(), getGameplayTrack(), RESULTS_VOLUME);
};
