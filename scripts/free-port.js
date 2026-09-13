import { execSync } from "node:child_process";

function getPortFromEnv() {
  const raw = process.env.SERVER_PORT ?? process.env.PORT;
  if (!raw) return 5001;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5001;
}

function isWindows() {
  return process.platform === "win32";
}

function findListeningPidsWindows(port) {
  const out = execSync("netstat -ano -p tcp", { stdio: ["ignore", "pipe", "ignore"] }).toString();
  const lines = out.split(/\r?\n/);

  const pids = new Set();
  for (const line of lines) {
    // Example:
    //  TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING       1234
    //  TCP    [::]:5000              [::]:0                 LISTENING       1234
    const normalized = line.trim().replace(/\s+/g, " ");
    if (!normalized) continue;
    if (!normalized.startsWith("TCP ")) continue;
    if (!normalized.includes(" LISTENING ")) continue;

    const parts = normalized.split(" ");
    // proto, local, foreign, state, pid
    if (parts.length < 5) continue;

    const local = parts[1];
    const pid = parts[4];

    // Match :<port> at end of local address
    if (!local.endsWith(`:${port}`)) continue;

    const pidNum = Number(pid);
    if (Number.isFinite(pidNum) && pidNum > 0) pids.add(pidNum);
  }

  return [...pids];
}

function killPidWindows(pid) {
  try {
    const tasklistOut = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();

    // Example: "node.exe","26832","Console","1","34,000 K"
    const firstLine = tasklistOut.split(/\r?\n/).find((l) => l.trim());
    if (!firstLine || firstLine.includes("No tasks are running")) return false;

    const imageName = firstLine.split(",")[0]?.replace(/^"|"$/g, "").toLowerCase();
    if (imageName !== "node.exe") {
      // eslint-disable-next-line no-console
      console.warn(
        `Port is held by PID ${pid} (${imageName ?? "unknown"}); not terminating non-node processes. Close it manually or set SERVER_PORT.`
      );
      return false;
    }

    execSync(`taskkill /PID ${pid} /F`, { stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const port = getPortFromEnv();

  if (!isWindows()) {
    // Keep script safe/no-op on non-Windows environments.
    return;
  }

  const pids = findListeningPidsWindows(port);
  if (pids.length === 0) return;

  for (const pid of pids) {
    const ok = killPidWindows(pid);
    if (ok) {
      // eslint-disable-next-line no-console
      console.log(`Freed port ${port} (killed PID ${pid})`);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`Port ${port} is in use by PID ${pid}, but it could not be terminated.`);
    }
  }
}

main();
