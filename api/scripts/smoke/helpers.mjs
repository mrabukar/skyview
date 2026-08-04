// Shared smoke-test helpers. No dependencies — uses Node 20+ global fetch.
export const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:5000";
const ORIGIN = new URL(BASE).origin;

let pass = 0;
let fail = 0;
const failures = [];

export function section(name) {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
}

export function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    fail += 1;
    const line = detail ? `${name} — ${detail}` : name;
    failures.push(line);
    console.log(`  \x1b[31m✗\x1b[0m ${line}`);
  }
}

export function summary() {
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  process.exit(0);
}

/** Calendar date (YYYY-MM-DD) in Africa/Nairobi, offset by `deltaDays`. */
export function nairobiDate(deltaDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** A cookie-jar-backed HTTP session for one user. */
export class Session {
  constructor(label) {
    this.label = label;
    this.cookies = {};
  }

  #absorb(res) {
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      if (idx > 0) this.cookies[pair.slice(0, idx)] = pair.slice(idx + 1);
    }
  }

  #cookieHeader() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  async req(method, path, { body } = {}) {
    const headers = { Origin: ORIGIN };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const ck = this.#cookieHeader();
    if (ck) headers["Cookie"] = ck;

    let res;
    try {
      res = await fetch(BASE + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        redirect: "manual",
      });
    } catch (e) {
      return { status: 0, ok: false, json: null, text: String(e) };
    }
    this.#absorb(res);

    let text = null;
    let json = null;
    try {
      text = await res.text();
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON body */
    }
    return { status: res.status, ok: res.ok, json, text };
  }
}
