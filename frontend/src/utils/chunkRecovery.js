const RECOVERY_KEY = 'gyansutra_chunk_recovery';
const RECOVERY_WINDOW_MS = 60_000;

export function isChunkLoadError(error) {
  const message = error?.message || '';
  return error?.name === 'ChunkLoadError'
    || /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message);
}

function canAttemptRecovery() {
  try {
    const lastAttempt = Number(window.sessionStorage.getItem(RECOVERY_KEY));
    if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < RECOVERY_WINDOW_MS) {
      return false;
    }
    window.sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
    return true;
  } catch {
    // Never auto-refresh when the attempt cannot be remembered. The boot
    // fallback still offers a deliberate cache-clearing refresh to the user.
    return false;
  }
}

async function clearStaleAppShell() {
  if ('serviceWorker' in navigator) {
    const scope = new URL(import.meta.env.BASE_URL, window.location.origin).href;
    const registration = await navigator.serviceWorker.getRegistration(scope);
    await registration?.unregister();
  }

  if ('caches' in window) {
    const cacheNames = await window.caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => /precache|workbox/i.test(name))
        .map((name) => window.caches.delete(name)),
    );
  }
}

export async function recoverFromChunkError(error) {
  if (!isChunkLoadError(error) || !canAttemptRecovery()) return false;

  try {
    await clearStaleAppShell();
  } catch (recoveryError) {
    console.warn('Could not clear the stale application shell.', recoveryError);
  }

  window.location.reload();
  return true;
}
