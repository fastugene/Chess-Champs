/**
 * Free, on-device read-aloud via the browser's SpeechSynthesis API. Used for the
 * mentor lines and hints so a kid who'd rather listen than read can tap 🔊.
 */
export function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1.1;
    window.speechSynthesis.speak(u);
  } catch {
    /* not supported — silently ignore */
  }
}
