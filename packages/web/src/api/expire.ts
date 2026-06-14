/** Bridge so the api layer can lock the desktop when the session expires. */
let handler: (() => void) | null = null;

export function registerExpireHandler(fn: () => void): void {
  handler = fn;
}

export function notifyExpired(): void {
  handler?.();
}
