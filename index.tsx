/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlaybackState, Prompt } from './types';
import { GoogleGenAI, LiveMusicFilteredPrompt } from '@google/genai';
import { PromptDjMidi } from './components/PromptDjMidi';
import { ToastMessage } from './components/ToastMessage';
import { LiveMusicHelper } from './utils/LiveMusicHelper';
import { AudioAnalyser } from './utils/AudioAnalyser';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, apiVersion: 'v1alpha' });
const model = 'lyria-realtime-exp';

function main() {
  const initialPrompts = buildInitialPrompts();

  const pdjMidi = new PromptDjMidi();
  pdjMidi.prompts = initialPrompts;
  document.body.appendChild(pdjMidi as unknown as HTMLElement);

  const toastMessage = new ToastMessage();
  document.body.appendChild(toastMessage as unknown as HTMLElement);

  const liveMusicHelper = new LiveMusicHelper(ai, model);
  liveMusicHelper.setWeightedPrompts(initialPrompts);

  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  (pdjMidi as unknown as HTMLElement).addEventListener('prompts-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<Map<string, Prompt>>;
    const prompts = customEvent.detail;
    liveMusicHelper.setWeightedPrompts(prompts);
  }));

  (pdjMidi as unknown as HTMLElement).addEventListener('play-pause', () => {
    liveMusicHelper.playPause();
  });

  liveMusicHelper.addEventListener('playback-state-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<PlaybackState>;
    const playbackState = customEvent.detail;
    pdjMidi.playbackState = playbackState;
    playbackState === 'playing' ? audioAnalyser.start() : audioAnalyser.stop();
  }));

  liveMusicHelper.addEventListener('filtered-prompt', ((e: Event) => {
    const customEvent = e as CustomEvent<LiveMusicFilteredPrompt>;
    const filteredPrompt = customEvent.detail;
    toastMessage.show(filteredPrompt.filteredReason!)
    pdjMidi.addFilteredPrompt(filteredPrompt.text!);
  }));

  const errorToast = ((e: Event) => {
    const customEvent = e as CustomEvent<string>;
    const error = customEvent.detail;
    toastMessage.show(error);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  (pdjMidi as unknown as HTMLElement).addEventListener('error', errorToast);

  audioAnalyser.addEventListener('audio-level-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<number>;
    const level = customEvent.detail;
    pdjMidi.audioLevel = level;
  }));

}

function buildInitialPrompts() {
  // Start with a Slow C Minor configuration
  const startOn = ['C Minor', 'Slow Tempo', 'Adagio'];

  const prompts = new Map<string, Prompt>();

  for (let i = 0; i < DEFAULT_PROMPTS.length; i++) {
    const promptId = `prompt-${i}`;
    const prompt = DEFAULT_PROMPTS[i];
    const { text, color } = prompt;
    prompts.set(promptId, {
      promptId,
      text,
      weight: startOn.includes(text) ? 1 : 0,
      cc: i,
      color,
    });
  }

  return prompts;
}

const DEFAULT_PROMPTS = [
  { color: '#9900ff', text: 'C Minor' },
  { color: '#5200ff', text: 'Slow Tempo' },
  { color: '#ff25f6', text: 'Largo' },
  { color: '#2af6de', text: 'Adagio' },
  { color: '#ffdd28', text: 'Atmospheric' },
  { color: '#2af6de', text: 'Ethereal' },
  { color: '#9900ff', text: 'Cinematic' },
  { color: '#3dffab', text: 'Deep Bass' },
  { color: '#d8ff3e', text: 'Soft Piano' },
  { color: '#d9b2ff', text: 'Strings' },
  { color: '#3dffab', text: 'Melancholic' },
  { color: '#ffdd28', text: 'Dark' },
  { color: '#ff25f6', text: 'Minimal' },
  { color: '#d8ff3e', text: 'Reverb' },
  { color: '#5200ff', text: 'Lo-Fi' },
  { color: '#d9b2ff', text: 'Drone' },
];

main();