/**
 * Announcer voiceover — plays pre-rendered ElevenLabs mp3s from /public/audio/.
 * Any in-flight clip is stopped before the next one plays so events never overlap.
 */

const FILE_MAP: Record<string, string> = {
  'Double Kill!':             'double-kill',
  'Triple Kill!':             'triple-kill',
  'Mega Kill!':               'mega-kill',
  'Unstoppable!':             'unstoppable',
  'Rampage!':                 'rampage',
  'Free Kill!':               'free-kill',
  'Worth it!':                'worth-it',
  'Fork! Two targets at once!': 'fork',
  'Checkmate! You win!':      'checkmate',
};

let current: HTMLAudioElement | null = null;
let speechMuted = false;

export function setSpeechMuted(value: boolean): void {
  speechMuted = value;
  if (value && current) {
    current.pause();
    current.currentTime = 0;
  }
}

/** Stop any in-flight clip and play the given slug's mp3 from /public/audio. */
function playClip(slug: string): void {
  if (typeof window === 'undefined') return;
  if (speechMuted) return;

  if (current) {
    current.pause();
    current.currentTime = 0;
  }

  current = new Audio(`/audio/${slug}.mp3`);
  current.play().catch(() => { /* autoplay blocked or file missing — ignore */ });
}

/** Announcer phrase → mp3 (fixed set, mapped from spoken text). */
export function speak(text: string): void {
  const slug = FILE_MAP[text];
  if (!slug) return;
  playClip(slug);
}

/**
 * Play a narration clip by slug directly — used by the guided tutorial, whose
 * lines are authored per-chapter (see `TutorialScript.voice`). The mp3 is
 * pre-rendered in ElevenLabs and dropped in /public/audio; until then this
 * no-ops silently, so the tutorial works without the audio assets.
 */
export function speakSlug(slug: string): void {
  if (!slug) return;
  playClip(slug);
}
