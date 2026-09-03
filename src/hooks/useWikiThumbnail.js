import { useEffect, useState } from "react";

// Fetches a real photo for a landmark from Wikipedia's public summary API
// instead of hardcoding/guessing image URLs. Cached in-memory since the
// attraction list is static for the session. Cards fall back to an icon
// placeholder (handled by the caller) when a title has no article/thumbnail.
const cache = new Map();

// `loading` lets a card show a skeleton while the fetch is in flight instead
// of jumping straight to the icon placeholder and then popping in a photo —
// distinct from "settled, no photo" (loading: false, url: null).
export default function useWikiThumbnail(title) {
  const [url, setUrl] = useState(() => (cache.has(title) ? cache.get(title) : null));
  const [loading, setLoading] = useState(() => Boolean(title) && !cache.has(title));

  useEffect(() => {
    if (!title || cache.has(title)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const thumb = data?.thumbnail?.source || null;
        cache.set(title, thumb);
        if (!cancelled) {
          setUrl(thumb);
          setLoading(false);
        }
      })
      .catch(() => {
        cache.set(title, null);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [title]);

  return { url, loading };
}
