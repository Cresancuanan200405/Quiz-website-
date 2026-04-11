"use client";

const FINDING_OPPONENT_SRC = "/audio/finding-opponent.mp3";
const MATCH_FOUND_SRC = "/audio/match-found.mp3";
const COUNTDOWN_START_SRC = "/audio/3-2-1-start.mp3";
const GAMEPLAY_SRC = "/audio/trivia-gameplay.mp3";
const WINNER_SRC = "/audio/1v1-battle-winner.mp3";
const LOSER_SRC = "/audio/1v1-battle-loser.mp3";

let findingLoop: HTMLAudioElement | null = null;
let gameplayLoop: HTMLAudioElement | null = null;

const canUseAudio = () => typeof window !== "undefined";

const createOneShot = (src: string, volume: number) => {
  if (!canUseAudio()) return null;
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = volume;
  return audio;
};

const getFindingLoop = () => {
  if (!canUseAudio()) return null;
  if (!findingLoop) {
    findingLoop = new Audio(FINDING_OPPONENT_SRC);
    findingLoop.loop = true;
    findingLoop.preload = "auto";
    findingLoop.volume = 0.3;
  }
  return findingLoop;
};

const getGameplayLoop = () => {
  if (!canUseAudio()) return null;
  if (!gameplayLoop) {
    gameplayLoop = new Audio(GAMEPLAY_SRC);
    gameplayLoop.loop = true;
    gameplayLoop.preload = "auto";
    gameplayLoop.volume = 0.35;
  }
  return gameplayLoop;
};

const playLoop = async (track: HTMLAudioElement | null) => {
  if (!track || !track.paused) return;
  try {
    await track.play();
  } catch {
    // Browser autoplay policies may block playback before user interaction.
  }
};

const stopLoop = (track: HTMLAudioElement | null, resetVolume: number, shouldReset = true) => {
  if (!track) return;
  track.pause();
  if (shouldReset) {
    track.currentTime = 0;
  }
  track.volume = resetVolume;
};

const fadeOutAndStop = (track: HTMLAudioElement | null, resetVolume: number, durationMs = 360) => {
  if (!track || track.paused) {
    stopLoop(track, resetVolume, true);
    return;
  }

  const startVolume = track.volume;
  const stepMs = 40;
  const steps = Math.max(1, Math.round(durationMs / stepMs));
  let step = 0;

  const timer = window.setInterval(() => {
    step += 1;
    const progress = Math.min(1, step / steps);
    track.volume = Math.max(0, startVolume * (1 - progress));

    if (progress >= 1) {
      window.clearInterval(timer);
      stopLoop(track, resetVolume, true);
    }
  }, stepMs);
};

const playOneShot = async (src: string, volume: number) => {
  const clip = createOneShot(src, volume);
  if (!clip) return;
  try {
    await clip.play();
  } catch {
    // Ignore blocked one-shot playback.
  }
};

export const playFindingOpponentMusic = async () => {
  await playLoop(getFindingLoop());
};

export const stopFindingOpponentMusic = (fadeOut = true) => {
  const track = getFindingLoop();
  if (fadeOut) {
    fadeOutAndStop(track, 0.3);
    return;
  }
  stopLoop(track, 0.3, true);
};

export const playMatchFoundMusic = async () => {
  await playOneShot(MATCH_FOUND_SRC, 0.8);
};

export const playCountdownStartMusic = async () => {
  await playOneShot(COUNTDOWN_START_SRC, 0.85);
};

export const playBattleGameplayMusic = async () => {
  await playLoop(getGameplayLoop());
};

export const stopBattleGameplayMusic = (fadeOut = true) => {
  const track = getGameplayLoop();
  if (fadeOut) {
    fadeOutAndStop(track, 0.35);
    return;
  }
  stopLoop(track, 0.35, true);
};

export const playBattleWinnerMusic = async () => {
  await playOneShot(WINNER_SRC, 0.9);
};

export const playBattleLoserMusic = async () => {
  await playOneShot(LOSER_SRC, 0.9);
};

export const stopAllBattleAudio = () => {
  stopFindingOpponentMusic(false);
  stopBattleGameplayMusic(false);
};
