"use client";

const CORRECT_SFX_SRC = "/audio/correct-answer.mp3";
const WRONG_SFX_SRC = "/audio/wrong-answer.mp3";

let audioCtx: AudioContext | null = null;
let correctAudio: HTMLAudioElement | null = null;
let wrongAudio: HTMLAudioElement | null = null;

const canUseAudio = () => typeof window !== "undefined";

const getAudioContext = () => {
  if (!canUseAudio()) return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
};

const getCorrectAudio = () => {
  if (!canUseAudio()) return null;
  if (!correctAudio) {
    correctAudio = new Audio(CORRECT_SFX_SRC);
    correctAudio.preload = "auto";
    correctAudio.volume = 0.75;
  }
  return correctAudio;
};

const getWrongAudio = () => {
  if (!canUseAudio()) return null;
  if (!wrongAudio) {
    wrongAudio = new Audio(WRONG_SFX_SRC);
    wrongAudio.preload = "auto";
    wrongAudio.volume = 0.75;
  }
  return wrongAudio;
};

const playAudio = async (audio: HTMLAudioElement | null) => {
  if (!audio) return false;
  try {
    audio.pause();
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
};

const playTone = async (frequency: number, durationMs: number, gain = 0.035, type: OscillatorType = "sine") => {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  amp.gain.setValueAtTime(0.0001, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000 + 0.02);
};

export const playQuizTapSfx = () => {
  void playTone(740, 90, 0.02, "triangle");
};

export const playQuizCorrectSfx = () => {
  void (async () => {
    const played = await playAudio(getCorrectAudio());
    if (played) return;

    void playTone(660, 120, 0.03, "sine");
    window.setTimeout(() => {
      void playTone(880, 140, 0.032, "sine");
    }, 70);
  })();
};

export const playQuizWrongSfx = () => {
  void (async () => {
    const played = await playAudio(getWrongAudio());
    if (played) return;
    void playTone(230, 180, 0.032, "square");
  })();
};
