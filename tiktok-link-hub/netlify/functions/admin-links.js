
import { randomUUID } from "node:crypto";
import {
  redis,
  LINKS_KEY,
  COUNTER_PREFIX,
  json,
  validSession,
  validTikTokUrl
} from "../../lib/common.js";

async function all() {
  const ls = (await redis.get(LINKS_KEY)) || [];

  const links = await Promise.all(
    ls.map(async (l) => ({
      ...l,
      count: Number(
        (await redis.get(COUNTER_PREFIX + l.id)) || 0
      )
    }))
  );

  return {
    links,
    total: links.reduce((n, l) => n + l.count, 0)
  };
}

export async function handler(e) {
  if (!validSession(e)) {
    return json(401, { error: "Please sign in." });
  }

  let b = {};

  try {
    if (e.body) b = JSON.parse(e.body);
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  try {
    let ls = (await redis.get(LINKS_KEY)) || [];

    if (e.httpMethod === "GET") {
      return json(200, await all());
    }

    if (e.httpMethod === "POST") {
      const urls = Array.isArray(b.urls)
        ? b.urls
        : typeof b.urls === "string"
          ? b.urls.split(/\r?\n/)
          : [b.url];

      const cleaned = urls
        .filter((url) => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean);

      if (
        !cleaned.length ||
        cleaned.some((url) => !validTikTokUrl(url))
      ) {
        return json(400, {
          error: "Enter valid HTTPS TikTok URLs, one per line."
        });
      }

      const existing = new Set(ls.map((l) => l.url));
      let added = 0;

      for (const url of cleaned) {
        if (existing.has(url)) continue;

        ls.push({
          id: randomUUID(),
          label: "",
          url,
          enabled: true
        });

        existing.add(url);
        added++;
      }

      await redis.set(LINKS_KEY, ls);

      return json(201, { ok: true, added });
    }

    if (e.httpMethod === "PUT") {
      if (!validTikTokUrl(b.url)) {
        return json(400, {
          error: "Use a valid HTTPS TikTok URL."
        });
      }

      const i = ls.findIndex((x) => x.id === b.id);

      if (i < 0) {
        return json(404, { error: "Link not found" });
      }

      ls[i] = {
        ...ls[i],
        label: "",
        url: b.url
      };

      await redis.set(LINKS_KEY, ls);
      return json(200, { ok: true });
    }

    if (
      e.httpMethod === "PATCH" ||
      e.httpMethod === "DELETE"
    ) {
      const i = ls.findIndex((x) => x.id === b.id);

      if (i < 0) {
        return json(404, { error: "Link not found" });
      }

      if (e.httpMethod === "PATCH") {
        ls[i].enabled = Boolean(b.enabled);
      } else {
        ls.splice(i, 1);
      }

      await redis.set(LINKS_KEY, ls);
      return json(200, { ok: true });
    }

    return json(
      405,
      { error: "Method not allowed" },
      { Allow: "GET, POST, PUT, PATCH, DELETE" }
    );
  } catch (err) {
    console.error(err);
    return json(500, {
      error: "Redis operation failed. Check Netlify logs."
    });
  }
}
