const URL_REGEX = /https?:\/\/[^\s<>{}|\\^`[\]]+/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

const OG_CACHE = new Map<string, { title: string; description: string; imageUrl: string; cachedAt: number }>();
const OG_CACHE_TTL = 24 * 60 * 60 * 1000;
const OG_FETCH_TIMEOUT = 3000;

export interface OgPreview {
  title: string;
  description: string;
  imageUrl: string;
}

export interface LinkifySegment {
  text: string;
  type: 'text' | 'url' | 'email' | 'phone';
  href?: string;
}

export function linkify(text: string): LinkifySegment[] {
  const segments: LinkifySegment[] = [];
  const combined = new RegExp(`(${URL_REGEX.source})|(${EMAIL_REGEX.source})|(${PHONE_REGEX.source})`, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), type: 'text' });
    }
    if (match[1]) {
      segments.push({ text: match[1], type: 'url', href: match[1] });
    } else if (match[2]) {
      segments.push({ text: match[2], type: 'email', href: `mailto:${match[2]}` });
    } else if (match[3]) {
      segments.push({ text: match[3], type: 'phone', href: `tel:${match[3].replace(/[^+\d]/g, '')}` });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), type: 'text' });
  }

  return segments;
}

export async function fetchOgPreview(url: string): Promise<OgPreview | null> {
  const cached = OG_CACHE.get(url);
  if (cached && Date.now() - cached.cachedAt < OG_CACHE_TTL) {
    return { title: cached.title, description: cached.description, imageUrl: cached.imageUrl };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT);

    const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    const og: OgPreview = {
      title: data.data?.title || url,
      description: data.data?.description || '',
      imageUrl: data.data?.image?.url || '',
    };

    OG_CACHE.set(url, { ...og, cachedAt: Date.now() });
    return og;
  } catch (err) {
    console.warn('OG preview fetch failed:', err);
    return null;
  }
}

export function getDocTypeIcon(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
    'application/vnd.ms-excel': 'excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'ppt',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
  };
  return map[mime] || 'generic';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export function validateMedia(type: string, size: number): { valid: boolean; error?: string } {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
  const videoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4'];

  if (imageTypes.includes(type)) {
    if (size > 100 * 1024 * 1024) return { valid: false, error: 'Image exceeds 100MB limit' };
    return { valid: true };
  }
  if (videoTypes.includes(type)) {
    if (size > 2 * 1024 * 1024 * 1024) return { valid: false, error: 'Video exceeds 2GB limit' };
    return { valid: true };
  }
  if (audioTypes.includes(type)) {
    if (size > 500 * 1024 * 1024) return { valid: false, error: 'Audio exceeds 500MB limit' };
    return { valid: true };
  }
  if (type.startsWith('image/')) return { valid: false, error: 'Unsupported image format' };
  if (type.startsWith('video/')) return { valid: false, error: 'Unsupported video format' };

  return { valid: true };
}
