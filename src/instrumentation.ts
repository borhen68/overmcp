// Runs once when a new Next.js server instance starts.
export async function register() {
  // Only run on the Node.js server runtime (not edge).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logEnvStatus } = await import("./lib/env");
    logEnvStatus();
  }
}
