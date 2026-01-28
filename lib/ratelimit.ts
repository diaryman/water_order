const rateLimit = new Map<string, { count: number, resetTime: number }>();

export function checkRateLimit(ip: string, limit: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = rateLimit.get(ip);

    // Initial record or expired
    if (!record || now > record.resetTime) {
        rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }

    // Checking limit
    if (record.count >= limit) {
        return false;
    }

    // Increment
    record.count++;
    return true;
}
