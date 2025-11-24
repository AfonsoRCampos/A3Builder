
export function isoToDateString(isoString, format = "DD/MM/YYYY") {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date)) return "";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  if (format === "DD/MM/YYYY") return `${day}/${month}/${year}`;
  if (format === "DD/MM") return `${day}/${month}`;
  if (format === "DD/MM/YY") return `${day}/${month}/${String(year).slice(-2)}`;
  return `${day}/${month}/${year}`;
}

export function formatCommentTimestamp(input) {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d)) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month} ${hours}:${minutes}`;
}

export function formatCompact(value, opts = {}) {
  // opts: { locale, maxSig = 3, short = true }
  const locale = opts.locale || typeof navigator !== 'undefined' ? navigator.language : 'en';
  const maxSig = opts.maxSig || 3;

  // Guard non-numbers
  if (value === null || value === undefined || Number.isNaN(Number(value))) return String(value ?? '');

  const n = Number(value);
  // Try Intl compact formatting if available
  try {
    // Some runtimes might not support 'compact' -> this try/catch handles that
    const nf = new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: (opts.short === false) ? 'long' : 'short',
      maximumSignificantDigits: maxSig
    });
    return nf.format(n);
  } catch (e) {
    // fallback below
  }

  // Fallback: SI suffix with up to maxSig significant digits
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const tiers = [
    { value: 1e12, suffix: 'T' },
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
    { value: 1e3, suffix: 'k' }
  ];

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (abs >= t.value) {
      const v = abs / t.value;
      // preserve up to maxSig significant digits
      const digits = Math.max(0, maxSig - Math.floor(Math.log10(Math.floor(v))) - 1);
      let s = v.toFixed(digits);
      // strip trailing zeros and decimal point
      s = s.replace(/\.?0+$/, '');
      return sign + s + t.suffix;
    }
  }

  // small numbers: format with up to maxSig significant digits
  if (abs < 1) {
    // for numbers < 1 show up to (maxSig) decimal places but trim
    const digits = Math.max(0, maxSig - Math.floor(Math.log10(Math.floor(abs || 1))) - 1);
    let s = n.toFixed(Math.min(6, maxSig + 2)); // clamp decimals so we don't show huge precision
    s = s.replace(/\.?0+$/, '');
    return s;
  }

  // else normal int display but cap significant digits by rounding if needed
  const str = String(Math.round(n));
  if (str.length <= maxSig) return str;
  // turn 12345 -> 12.3k (reuse logic above)
  // fallback to dividing by 1k if large
  const v = n / 1000;
  let s = v.toPrecision(Math.min(maxSig, 3));
  s = Number(s).toString();
  return s + 'k';
}

export function toInitialLast(name) {
  if (!name) return "";
  const [first, last] = name.trim().split(" ");
  if (!first || !last) return name;
  return `${first.charAt(0).toUpperCase()}. ${capitalize(last)}`;
}

export function toFullName(name) {
  if (!name) return "";
  const [first, last] = name.trim().split(" ");
  if (!first || !last) return capitalize(name);
  return `${capitalize(first)} ${capitalize(last)}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getNextA3Id(a3s) {
  if (!Array.isArray(a3s) || a3s.length === 0) return "A3-001-A";
  const numbers = a3s
    .map(a3 => {
      const match = a3.header?.id?.match(/^A3-(\d+)-A$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  const maxNum = numbers.length ? Math.max(...numbers) : 0;
  const nextNum = (maxNum + 1).toString().padStart(3, "0");
  return `A3-${nextNum}-A`;
}

export function getBars(initial, target, initialLabel, targetLabel, gapLabel, placeholder, unit) {
  let bars = {};
  if (!initial) {
    if (!target.value) { // No initial and no target -> 
      // bars = ["Middle", [0, 0], "Middle"];
      bars = {
        initial: {
          y: (placeholder.up === null ? "Middle" : placeholder.up ? "Low" : "High"),
          label: initialLabel
        },
        gap: {
          type: (placeholder.up === null ? "none" : placeholder.up ? "arrow-up" : "arrow-down"),
          label: (placeholder.gap === null ? (placeholder.up ? "Increase" : "Decrease") : placeholder.gap),
        },
        target: {
          y: (placeholder.up === null ? "Middle" : placeholder.up ? "High" : "Low"),
          label: targetLabel
        }
      };
    } else {
      // barHeights = [0, [0, 0], "Middle"];
      bars = {
        initial: {
          y: 0,
          label: initialLabel
        },
        gap: {
          type: "none",
          label: gapLabel
        },
        target: {
          y: "Middle",
          label: targetLabel
        }
      };
    }
  }
  else {
    if (!target.value) {
      // barHeights = ["Middle", [0, 0], 0];
      bars = {
        initial: {
          y: "Middle",
          label: initialLabel
        },
        gap: {
          type: "none",
          label: gapLabel
        },
        target: {
          y: "Middle",
          label: targetLabel
        }
      };
    }
    else {
      if (Number(target.value) < Number(initial)) {
        bars = {
          initial: {
            y: "High",
            label: initialLabel
          },
          gap: {
            type: "arrow-down",
            label: formatCompact(Number(target.value) - Number(initial)) + ` (${target.percent >= 0 ? '+' : ''}${formatCompact(target.percent)}%)`
          },
          target: {
            y: "Low",
            label: targetLabel
          }
        };
      } else {
        bars = {
          initial: {
            y: "Low",
            label: initialLabel
          },
          gap: {
            type: "arrow-up",
            label: formatCompact(Number(target.value) - Number(initial))
          },
          target: {
            y: "High",
            label: targetLabel
          }
        };
      }
    }
  }
  return bars;
}

export function getContrastTextColor(bg) {
  if (!bg) return '#000000';
  const s = String(bg).trim().toLowerCase();

  let r = 0, g = 0, b = 0;

  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      return '#000000';
    }
  } else if (s.startsWith('rgb')) {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map(p => parseFloat(p));
      r = parts[0] || 0;
      g = parts[1] || 0;
      b = parts[2] || 0;
    } else {
      return '#000000';
    }
  } else {
    // Unknown format - fall back to black
    return '#000000';
  }

  // convert sRGB to linear RGB
  const srgb = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];

  // WCAG threshold (rough). If luminance is high, return dark text, else light text.
  return lum > 0.179 ? '#000000' : '#ffffff';
}




