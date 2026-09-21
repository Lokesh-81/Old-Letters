/**
 * Sound module disabled per user request.
 * All sound functions safely resolved to no-ops.
 */

export function isSoundSupported(): boolean {
  return false;
}

export function setSoundMuted(_muted: boolean): void {
  // Sound disabled
}

export function getSoundMuted(): boolean {
  return true;
}

export function playPaperRustle(): void {
  // Sound disabled
}

export function playSealBreak(): void {
  // Sound disabled
}

export function playPenNib(): void {
  // Sound disabled
}

export function playStampThud(): void {
  // Sound disabled
}
