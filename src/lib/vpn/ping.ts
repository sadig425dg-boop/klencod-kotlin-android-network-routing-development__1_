import { Socket } from "node:net";

/** Measures raw TCP connect latency to host:port, in milliseconds. */
export function tcpPing(host: string, port: number, timeoutMs = 4000): Promise<number | null> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const start = Date.now();
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(Date.now() - start));
    socket.once("timeout", () => finish(null));
    socket.once("error", () => finish(null));

    try {
      socket.connect({ host, port });
    } catch {
      finish(null);
    }
  });
}

/** Pings a batch of targets concurrently with a concurrency cap. */
export async function pingBatch(
  targets: { id: number; address: string; port: number }[],
  concurrency = 8,
): Promise<Map<number, number | null>> {
  const results = new Map<number, number | null>();
  let cursor = 0;

  async function worker() {
    while (cursor < targets.length) {
      const index = cursor;
      cursor += 1;
      const target = targets[index];
      const latency = await tcpPing(target.address, target.port);
      results.set(target.id, latency);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
