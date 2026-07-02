// Natural language date/time parser
// Converts phrases like "tomorrow 7 AM", "next Monday", "in 2 hours",
// "this evening", "weekend" into ISO date strings or HH:mm times.

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface ParsedDateTime {
  date?: string;   // YYYY-MM-DD
  time?: string;   // HH:mm
  iso?: string;    // full ISO if both date + time
  matched: boolean;
  original: string;
}

const TIME_KEYWORDS: Record<string, string> = {
  'midnight': '00:00',
  'noon': '12:00',
  'morning': '08:00',
  'afternoon': '14:00',
  'evening': '18:00',
  'night': '21:00',
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Parse a natural language date/time string.
// Returns matched=false if nothing recognized.
export function parseNaturalDateTime(input: string): ParsedDateTime {
  const text = ' ' + input.toLowerCase().trim() + ' ';
  const now = new Date();
  const result: ParsedDateTime = { matched: false, original: input };

  // ---------- Date parsing ----------
  let date: Date | null = null;

  // "today"
  if (/\btoday\b/.test(text)) {
    date = new Date(now);
  }
  // "tomorrow" / "tmrw"
  else if (/\btomorrow\b|\btmrw\b|\btmr\b/.test(text)) {
    date = new Date(now);
    date.setDate(date.getDate() + 1);
  }
  // "day after tomorrow"
  else if (/day after tomorrow/.test(text)) {
    date = new Date(now);
    date.setDate(date.getDate() + 2);
  }
  // "yesterday"
  else if (/\byesterday\b/.test(text)) {
    date = new Date(now);
    date.setDate(date.getDate() - 1);
  }
  // "next monday", "next week", "next month"
  else if (/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.test(text)) {
    const match = text.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (match) {
      const target = WEEKDAYS.indexOf(match[1]);
      date = new Date(now);
      const current = date.getDay();
      let diff = target - current;
      if (diff <= 0) diff += 7;
      date.setDate(date.getDate() + diff);
    }
  } else if (/\bnext week\b/.test(text)) {
    date = new Date(now);
    date.setDate(date.getDate() + 7);
  } else if (/\bnext month\b/.test(text)) {
    date = new Date(now);
    date.setMonth(date.getMonth() + 1);
  }
  // "this weekend" / "weekend" → upcoming Saturday
  else if (/\bweekend\b|\bthis weekend\b/.test(text)) {
    date = new Date(now);
    const current = date.getDay();
    const diff = current === 6 ? 7 : (6 - current); // next Saturday
    date.setDate(date.getDate() + diff);
  }
  // "in N days/weeks/months"
  else if (/in (\d+) (day|days|week|weeks|month|months)/.test(text)) {
    const match = text.match(/in (\d+) (day|days|week|weeks|month|months)/);
    if (match) {
      const n = parseInt(match[1], 10);
      const unit = match[2];
      date = new Date(now);
      if (unit.startsWith('day')) date.setDate(date.getDate() + n);
      else if (unit.startsWith('week')) date.setDate(date.getDate() + n * 7);
      else if (unit.startsWith('month')) date.setMonth(date.getMonth() + n);
    }
  }
  // "in N hours" / "in N mins" — handled in time section below
  // "monday" / "tuesday" alone → next occurrence
  else {
    for (let i = 0; i < 7; i++) {
      const wd = WEEKDAYS[i];
      const re = new RegExp(`\\b${wd}\\b`);
      if (re.test(text)) {
        const current = now.getDay();
        let diff = i - current;
        if (diff <= 0) diff += 7;
        date = new Date(now);
        date.setDate(date.getDate() + diff);
        break;
      }
    }
  }

  // ---------- Time parsing ----------
  let time: string | null = null;

  // "7 AM", "7am", "7:30 AM", "7:30am"
  const ampmMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const period = ampmMatch[3];
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    time = `${pad(h)}:${pad(m)}`;
  }
  // "19:00", "07:30" (24h)
  else {
    const h24Match = text.match(/\b(\d{1,2}):(\d{2})\b/);
    if (h24Match) {
      const h = parseInt(h24Match[1], 10);
      const m = parseInt(h24Match[2], 10);
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        time = `${pad(h)}:${pad(m)}`;
      }
    }
  }

  // Time keywords (morning, evening, etc.) — only if no explicit time yet
  if (!time) {
    for (const [kw, t] of Object.entries(TIME_KEYWORDS)) {
      const re = new RegExp(`\\b${kw}\\b`);
      if (re.test(text)) {
        time = t;
        // If no date but keyword implies a time of day, default to today
        if (!date) date = new Date(now);
        break;
      }
    }
  }

  // "in N hours" / "in N mins" — relative to now
  if (!time) {
    const hoursMatch = text.match(/in (\d+) hours?/);
    const minsMatch = text.match(/in (\d+) mins?|in (\d+) minutes?/);
    if (hoursMatch || minsMatch) {
      const dt = new Date(now);
      if (hoursMatch) dt.setHours(dt.getHours() + parseInt(hoursMatch[1], 10));
      if (minsMatch) {
        const m = minsMatch[1] || minsMatch[2];
        dt.setMinutes(dt.getMinutes() + parseInt(m, 10));
      }
      date = dt;
      time = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
  }

  // If we got either date or time, mark as matched
  if (date || time) {
    result.matched = true;
    if (date) result.date = toISODate(date);
    if (time) result.time = time;
    if (date && time) {
      const d = date;
      const [h, m] = time.split(':').map(Number);
      d.setHours(h, m, 0, 0);
      result.iso = d.toISOString();
    }
  }

  return result;
}

// Extract a "task title" by removing date/time phrases from the input.
// e.g. "Add gym tomorrow 7 AM" → "gym"
export function stripDateTimePhrases(input: string): string {
  let s = input;
  // Remove common command prefixes
  s = s.replace(/^(add|create|new|schedule|remind me to|set up|make)\s+/i, '');
  s = s.replace(/^(delete|remove|drop)\s+/i, '');
  s = s.replace(/^(move|reschedule|shift|postpone)\s+/i, '');
  s = s.replace(/^(complete|done|finish|mark done)\s+/i, '');
  s = s.replace(/^(rename|update|edit)\s+/i, '');
  s = s.replace(/^(show|list|view|what are)\s+/i, '');
  // Remove date/time phrases
  s = s.replace(/\btoday\b|\btomorrow\b|\btmrw\b|\btmr\b|\byesterday\b/gi, '');
  s = s.replace(/\bday after tomorrow\b/gi, '');
  s = s.replace(/\bnext (monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)\b/gi, '');
  s = s.replace(/\b(weekend|this weekend)\b/gi, '');
  s = s.replace(/\bin (\d+) (day|days|week|weeks|month|months|hour|hours|min|mins|minute|minutes)\b/gi, '');
  s = s.replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '');
  s = s.replace(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi, '');
  s = s.replace(/\b(\d{1,2}):(\d{2})\b/g, '');
  s = s.replace(/\b(midnight|noon|morning|afternoon|evening|night)\b/gi, '');
  s = s.replace(/\bat\s+/gi, '');
  s = s.replace(/\bon\s+/gi, '');
  s = s.replace(/\bby\s+/gi, '');
  s = s.replace(/\s+/g, ' ').trim();
  // Remove trailing "task" / "session" / "block" if it's just a leftover
  s = s.replace(/\s+(task|session|block)$/i, '');
  return s;
}

export { todayISO };
