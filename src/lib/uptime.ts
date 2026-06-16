export interface UptimeCheck {
  url: string;
  status: "up" | "down" | "slow";
  statusCode: number;
  responseTime: number;
  checkedAt: string;
}

export async function checkUptime(url: string): Promise<UptimeCheck> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(normalizedUrl, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - start;

    let status: "up" | "down" | "slow";
    if (res.status >= 500) {
      status = "down";
    } else if (responseTime > 3000) {
      status = "slow";
    } else {
      status = "up";
    }

    return {
      url: normalizedUrl,
      status,
      statusCode: res.status,
      responseTime,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      url: normalizedUrl,
      status: "down",
      statusCode: 0,
      responseTime: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  }
}
