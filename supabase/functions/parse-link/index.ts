const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type SourceType = "tiktok" | "instagram" | "maps";
type LogEntry = { stage: string; status: "ok" | "warning" | "error"; message: string; detail?: string };

type ParsedSpot = {
  title: string;
  thumbnail: string;
  sourceType: SourceType;
  sourceUrl: string;
  address: string;
  lat: number;
  lng: number;
  categories: string[];
  distanceMi: number;
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sourceTypeFor(url: string): SourceType {
  const lower = url.toLowerCase();
  if (lower.includes("instagram")) return "instagram";
  if (lower.includes("google") || lower.includes("maps")) return "maps";
  return "tiktok";
}

function isAllowedSourceHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\\./, "");
  return ["tiktok.com", "vm.tiktok.com", "instagram.com", "instagr.am", "google.com", "maps.google.com"].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function meta(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
  return "";
}

function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split("/").filter(Boolean).pop() || parsed.hostname;
    return cleanText(segment.replace(/[-_]/g, " ")).replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return "New spot";
  }
}

// Extract a street address from text
function findAddress(text: string): string {
  const address = text.match(/\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,5}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Place|Pl|Court|Ct)\b[^.!?\n]*/i);
  if (!address) return "";
  // Strip any trailing hours, hashtags, or city noise that got captured
  return cleanText(address[0].replace(/\b(?:Hours?|Open|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|#).*$/i, "").replace(/[#@]\w+/g, "").trim());
}

// Generic platform titles that should never be used as a venue name
const GENERIC_TITLES = [
  "tiktok - make your day",
  "tiktok",
  "instagram",
  "instagram photos and videos",
  "explore page",
  "google maps",
];

function isGenericTitle(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return GENERIC_TITLES.some((t) => lower === t || lower.startsWith(t));
}

// Remove noise from a caption: hashtags, @mentions, emojis, hours, etc.
function cleanCaption(text: string): string {
  return text
    .replace(/#[\w]+/g, "")
    .replace(/@[\w.]+/g, "")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\bHours?:\s*[^.!?\n]*(?:AM|PM|am|pm)[^.!?\n]*/g, "")
    .replace(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[–\-]\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*:?\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\s*[–\-]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)/gi, "")
    .replace(/\bOpen\s*(?:from|daily)?\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\s*[–\-]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract a likely restaurant/venue name from a social caption.
function extractVenueName(caption: string, pageTitle: string): string {
  // Only use page title if it's NOT a generic platform title
  if (pageTitle && !isGenericTitle(pageTitle) && pageTitle.length < 80) {
    const cleaned = pageTitle.split(/[|•–—–|]/)[0].trim();
    if (cleaned && cleaned.length > 2 && !isGenericTitle(cleaned)) return cleaned;
  }

  // Clean the caption: remove hashtags, @mentions, emojis, hours
  const cleaned = cleanCaption(caption);
  if (!cleaned) return titleFromUrl("");

  // Pattern 1: "Name — description" or "Name | description"
  const dashSplit = cleaned.split(/[—–|•]/)[0].trim();
  if (dashSplit.length > 2 && dashSplit.length < 60 && !isGenericTitle(dashSplit)) return dashSplit;

  // Pattern 2: "Best <food> at <Name>" or "<food> at <Name>"
  const atMatch = cleaned.match(/(?:at|from|by)\s+([A-Z][\w&'’.-]+(?:\s+[A-Z][\w&'’.-]+){0,3})/);
  if (atMatch?.[1] && atMatch[1].length > 2 && !isGenericTitle(atMatch[1])) return atMatch[1].trim();

  // Pattern 3: First capitalized phrase before punctuation
  const firstPhrase = cleaned.match(/^([A-Z][\w&'’.-]+(?:\s+[A-Z][\w&'’.-]+){0,4})/);
  if (firstPhrase?.[1] && firstPhrase[1].length > 2 && !isGenericTitle(firstPhrase[1])) return firstPhrase[1].trim();

  // Fallback: first few words
  const words = cleaned.split(" ").slice(0, 4).join(" ");
  return words || titleFromUrl("");
}

function categoriesFor(text: string): string[] {
  const lower = text.toLowerCase();
  const categories = new Set<string>();
  if (/taco|ramen|restaurant|food|brunch|cafe|coffee|pizza|burger|sushi|bakery|dining|eat|kitchen|grill|noodle|diner|bar/.test(lower)) categories.add("Food");
  if (/bar|cocktail|club|nightlife|lounge|rooftop|wine|beer|dj|arcade|pub|drinks/.test(lower)) categories.add("Nightlife");
  if (/park|trail|hike|beach|ocean|outdoor|garden|lake|mountain|pier|sunset|coast|bay|view/.test(lower)) categories.add("Outdoor");
  if (/chill|cozy|patio|relax|spa|quiet|cafe|coffee|brunch|lounge/.test(lower)) categories.add("Chill");
  return categories.size ? [...categories] : ["Food"];
}

// Haversine distance in miles from a reference point (SF by default)
function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// SF reference point for distance
const REF_LAT = 37.7749;
const REF_LNG = -122.4194;

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  category?: string;
  namedetails?: Record<string, string>;
  extratags?: Record<string, string>;
  address?: Record<string, string>;
  name?: string;
};

async function searchPlace(query: string, logs: LogEntry[]): Promise<{ name: string; address: string; lat: number; lng: number; category: string; photoUrl: string } | null> {
  if (!query) {
    logs.push({ stage: "search", status: "warning", message: "No venue name or address was found in the caption." });
    return null;
  }

  // Try structured Nominatim search with amenity/venue detection
  const searchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}&addressdetails=1&extratags=1&namedetails=1`;
  logs.push({ stage: "search", status: "ok", message: `Searching OpenStreetMap for: ${query}` });

  try {
    const result = await fetch(searchUrl, { headers: { "User-Agent": "PoolParser/1.0 contact: support@pool.app" } });
    if (!result.ok) {
      logs.push({ stage: "search", status: "error", message: `Place search returned HTTP ${result.status}` });
      return null;
    }
    const matches = await result.json() as NominatimResult[];
    if (!matches.length) {
      logs.push({ stage: "search", status: "warning", message: "No matching place found on OpenStreetMap." });
      return null;
    }

    // Prefer results that look like a business/venue
    const venueTypes = ["restaurant", "cafe", "bar", "pub", "fast_food", "amenity", "shop", "tourism", "leisure", "office"];
    let best: NominatimResult | undefined = matches.find((m) =>
      venueTypes.some((vt) => (m.type || "").includes(vt) || (m.category || "").includes(vt)),
    );
    if (!best) best = matches[0];

    const lat = Number(best.lat);
    const lng = Number(best.lon);
    if (!lat || !lng) {
      logs.push({ stage: "search", status: "warning", message: "Place found but has no coordinates." });
      return null;
    }

    // Extract a clean name
    const placeName = best.name || best.namedetails?.name || best.extratags?.name || best.namedetails?.brand || best.extratags?.brand || "";

    // Build a short address from address components
    const a = best.address || {};
    const street = a.road || a.pedestrian || a.footway || "";
    const house = a.house_number || "";
    const city = a.city || a.town || a.village || a.hamlet || "";
    const state = a.state || "";
    const shortAddress = [street ? `${house} ${street}`.trim() : "", city, state].filter(Boolean).join(", ") || best.display_name || "";

    // Determine category from OSM type
    const osmType = best.type || best.category || "";
    let category = "Food";
    if (/restaurant|cafe|coffee|fast_food|food|bakery|pub/.test(osmType)) category = "Food";
    else if (/bar|nightclub|pub|wine|beer/.test(osmType)) category = "Nightlife";
    else if (/park|garden|beach|mountain|trail|viewpoint|nature_reserve/.test(osmType)) category = "Outdoor";
    else if (/spa|lounge|leisure/.test(osmType)) category = "Chill";

    logs.push({ stage: "search", status: "ok", message: `Found: ${placeName || shortAddress}`, detail: best.display_name });

    // Try to get a photo from Wikimedia Commons via the OSM wikidata tag
    let photoUrl = "";
    const wikidataId = best.extratags?.wikidata || best.namedetails?.wikidata;
    if (wikidataId) {
      photoUrl = await fetchWikimediaPhoto(wikidataId, logs);
    }

    return {
      name: placeName || titleFromUrl(query),
      address: shortAddress,
      lat,
      lng,
      category,
      photoUrl,
    };
  } catch (error) {
    logs.push({ stage: "search", status: "error", message: "Place search failed", detail: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function fetchWikimediaPhoto(wikidataId: string, logs: LogEntry[]): Promise<string> {
  try {
    // Get the P18 (image) claim from Wikidata
    const wdUrl = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
    const wdResp = await fetch(wdUrl, { headers: { "User-Agent": "PoolParser/1.0 contact: support@pool.app" } });
    if (!wdResp.ok) return "";
    const wdData = await wdResp.json() as { entities?: Record<string, { claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: string } } }>> }> };
    const entity = wdData.entities?.[Object.keys(wdData.entities || {})[0]];
    const imageClaim = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!imageClaim) return "";

    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=640&titles=${encodeURIComponent(`File:${imageClaim}`)}`;
    const commonsResp = await fetch(commonsUrl, { headers: { "User-Agent": "PoolParser/1.0 contact: support@pool.app" } });
    if (!commonsResp.ok) return "";
    const commonsData = await commonsResp.json() as { query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string }> }> } };
    const page = commonsData.query?.pages ? Object.values(commonsData.query.pages)[0] : undefined;
    const photoUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || "";
    if (photoUrl) {
      logs.push({ stage: "photo", status: "ok", message: "Found a place photo from Wikimedia Commons." });
    }
    return photoUrl;
  } catch {
    logs.push({ stage: "photo", status: "warning", message: "Could not retrieve a photo from Wikimedia Commons." });
    return "";
  }
}

async function fetchText(url: string, logs: LogEntry[], sourceRequest = false): Promise<string> {
  let currentUrl = url;
  logs.push({ stage: "source", status: "ok", message: `Fetching ${url}` });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    for (let redirect = 0; redirect <= 3; redirect += 1) {
      const parsed = new URL(currentUrl);
      if (sourceRequest && !isAllowedSourceHost(parsed.hostname)) {
        logs.push({ stage: "source", status: "error", message: "The link host is not supported." });
        return "";
      }
      const result = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PoolParser/1.0)" },
      });
      if (result.status >= 300 && result.status < 400) {
        const location = result.headers.get("location");
        if (!location || redirect === 3) {
          logs.push({ stage: "source", status: "error", message: "The source used too many or invalid redirects." });
          return "";
        }
        const nextUrl = new URL(location, currentUrl);
        if (sourceRequest && !isAllowedSourceHost(nextUrl.hostname)) {
          logs.push({ stage: "source", status: "error", message: "The source redirected to an unsupported host." });
          return "";
        }
        currentUrl = nextUrl.toString();
        continue;
      }
      const body = await result.text();
      logs.push({ stage: "source", status: result.ok ? "ok" : "warning", message: `Source responded with HTTP ${result.status}`, detail: `Received ${body.length} characters.` });
      return result.ok ? body : "";
    }
    return "";
  } catch (error) {
    logs.push({ stage: "source", status: "error", message: "Could not fetch the source page", detail: error instanceof Error ? error.message : String(error) });
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return response(null, 200);
  const logs: LogEntry[] = [];
  try {
    const body = await request.json() as { url?: string };
    const url = body.url?.trim();
    if (!url) return response({ error: "A link is required.", logs: [{ stage: "input", status: "error", message: "No URL was provided." }] }, 400);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Only http and https links are supported.");
    } catch (error) {
      return response({ error: "That does not look like a valid web link.", logs: [{ stage: "input", status: "error", message: error instanceof Error ? error.message : "Invalid URL" }] }, 400);
    }

    if (!isAllowedSourceHost(parsedUrl.hostname)) {
      logs.push({ stage: "input", status: "error", message: "Only TikTok, Instagram, and Google Maps links are supported.", detail: parsedUrl.hostname });
      return response({ error: "Please paste a TikTok, Instagram, or Google Maps link.", logs }, 400);
    }
    const sourceType = sourceTypeFor(url);
    logs.push({ stage: "input", status: "ok", message: `Recognized ${sourceType} link`, detail: parsedUrl.hostname });
    let caption = "";
    let thumbnail = "";
    let pageTitle = "";

    // Step 1: Extract caption from social metadata
    if (sourceType === "tiktok") {
      const oembed = await fetchText(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, logs);
      if (oembed) {
        try {
          const data = JSON.parse(oembed) as { title?: string; thumbnail_url?: string };
          const oembedTitle = cleanText(data.title || "");
          // Only use oEmbed title if it's NOT a generic platform title
          if (oembedTitle && !isGenericTitle(oembedTitle)) {
            caption = oembedTitle;
          }
          thumbnail = data.thumbnail_url || "";
          logs.push({ stage: "metadata", status: caption ? "ok" : "warning", message: caption ? "TikTok caption extracted." : "TikTok oEmbed returned a generic title; will try page metadata." });
        } catch {
          logs.push({ stage: "metadata", status: "warning", message: "TikTok response was not valid oEmbed JSON." });
        }
      }
    }

    const page = await fetchText(url, logs, true);
    if (page) {
      pageTitle = meta(page, "og:title") || meta(page, "twitter:title") || meta(page, "description") || meta(page, "og:description") || cleanText(page.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "");
      const pageImage = meta(page, "og:image") || meta(page, "twitter:image");
      // Only use page title as caption if it's not generic AND we don't already have a real caption
      if (!caption && pageTitle && !isGenericTitle(pageTitle)) caption = pageTitle;
      if (pageImage && !thumbnail) thumbnail = pageImage;
      logs.push({ stage: "metadata", status: pageTitle ? "ok" : "warning", message: pageTitle ? (isGenericTitle(pageTitle) ? "Page title was generic; relying on caption." : "Page metadata extracted.") : "No readable metadata from the page." });
    }

    if (sourceType === "instagram" && !caption) {
      logs.push({ stage: "metadata", status: "warning", message: "Instagram did not expose caption data. Instagram often requires an approved API token." });
    }
    if (!caption) {
      logs.push({ stage: "metadata", status: "warning", message: "No caption was available. Using the URL as fallback." });
      caption = titleFromUrl(url);
    }

    // Step 2: Extract venue name and/or address from caption
    const cleanedCap = cleanCaption(caption);
    const addressInCaption = findAddress(cleanedCap);
    const venueName = extractVenueName(caption, pageTitle);
    logs.push({ stage: "extract", status: "ok", message: `Venue name: ${venueName}`, detail: addressInCaption ? `Address found: ${addressInCaption}` : "No street address found in caption." });

    // Step 3: Search for the place on OpenStreetMap
    const searchQuery = addressInCaption || venueName;
    const place = await searchPlace(searchQuery, logs);

    // Step 4: Build the spot from search results
    let title: string;
    let address: string;
    let lat: number;
    let lng: number;
    let categories: string[];
    let photo: string;

    if (place) {
      title = place.name;
      address = place.address;
      lat = place.lat;
      lng = place.lng;
      categories = [place.category, ...categoriesFor(`${venueName} ${caption}`).filter((c) => c !== place.category)].slice(0, 2);
      photo = place.photoUrl;
      // If no photo from Wikimedia, keep the social thumbnail
      if (!photo) photo = thumbnail;
    } else {
      title = venueName || titleFromUrl(url);
      address = addressInCaption || "Location not found";
      lat = REF_LAT;
      lng = REF_LNG;
      categories = categoriesFor(`${venueName} ${caption}`);
      photo = thumbnail;
    }

    const distanceMi = haversineMi(REF_LAT, REF_LNG, lat, lng);
    logs.push({ stage: "classification", status: "ok", message: `Categories: ${categories.join(", ")}` });
    logs.push({ stage: "distance", status: "ok", message: `${distanceMi} mi away` });

    const spot: ParsedSpot = {
      title,
      thumbnail: photo || "https://images.pexels.com/photos/287975/pexels-photo-287975.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
      sourceType,
      sourceUrl: url,
      address,
      lat,
      lng,
      categories,
      distanceMi,
    };
    logs.push({ stage: "complete", status: "ok", message: "Parser finished. Review the spot before adding." });
    return response({ spot, logs });
  } catch (error) {
    logs.push({ stage: "complete", status: "error", message: "Parser stopped unexpectedly", detail: error instanceof Error ? error.message : String(error) });
    return response({ error: "The parser stopped before it could create a spot.", logs }, 500);
  }
});
