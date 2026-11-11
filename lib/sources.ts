/* eslint-disable @typescript-eslint/no-explicit-any */
export type RawItem = { url: string; date: string; type: string; text: string };
export type Source = RawItem & { id: string };

function clean(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ").trim();
}

// Hacker News comments (free, no key)
export async function searchHN(query: string, n = 10): Promise<RawItem[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=comment&hitsPerPage=${n}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.hits.filter((h: any) => h.comment_text).map((h: any) => ({
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      date: (h.created_at || "").slice(0, 10),
      type: "hackernews",
      text: clean(h.comment_text).slice(0, 500),
    }));
  } catch { return []; }
}

// Text of a public web page (pricing page, features page...)
export async function fetchPageText(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) return "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (VentureMindBot)" },
      signal: AbortSignal.timeout(10000),
    });
    return clean(await res.text()).slice(0, 4000);
  } catch { return ""; }
}

// Split pasted text into chunks (separate items with a blank line)
export function pastedItems(text: string | null): RawItem[] {
  return (text || "").split(/\n\s*\n/).map(t => t.trim()).filter(Boolean)
    .map(t => ({ url: "", date: "", type: "pasted", text: t.slice(0, 600) }));
}

// Give every item an id (S1, S2...) and remove duplicate links
export function numberSources(items: RawItem[]): Source[] {
  const seen = new Set<string>();
  const unique = items.filter(i => {
    if (!i.url) return true;
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });
  return unique.map((x, i) => ({ ...x, id: `S${i + 1}` }));
}