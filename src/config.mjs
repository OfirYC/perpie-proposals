import { readFile } from "node:fs/promises";
import { join } from "node:path";

const COLOR_KEYS = [
  "primary",
  "blur",
  "telegramAccent",
  "theme",
  "telegramBotAccent"
];

const isObject = value => value && typeof value === "object" && !Array.isArray(value);

const LEGACY_FILES = {
  "notion-cover": "notion-cover.jpg",
  "users-love-tg": "users-love-tg.jpg",
  "partnership-banner": "Partnership Baner.jpg",
  logo: "logo.jpg",
  groups: "groups.jpg",
  selfcustody: "selfcustody.jpg",
  charts: "charts.jpg",
  "transactional-miniapp": "transactional-miniapp.jpg",
  "traders-tracker": "traders-tracker.jpg",
  "ai-feature": "ai-feature.jpg",
  notifications: "notifications.jpg",
  pnlcards: "pnlcards.jpg",
  "batch-transactions": "batch-transactions.jpg",
  "referral-system": "referral-system.jpg"
};

export function merge(base, override) {
  if (!isObject(base) || !isObject(override)) return structuredClone(override);
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(override)) {
    result[key] = isObject(value) && isObject(result[key])
      ? merge(result[key], value)
      : structuredClone(value);
  }
  return result;
}

function validate(protocol) {
  for (const key of ["slug", "name", "logo"]) {
    if (typeof protocol[key] !== "string" || !protocol[key].trim()) {
      throw new Error(`Invalid protocol field: ${key}`);
    }
  }
  for (const key of COLOR_KEYS) {
    if (!/^#[0-9a-f]{6}$/i.test(protocol.colors?.[key] ?? "")) {
      throw new Error(`Invalid protocol field: colors.${key}`);
    }
  }
  for (const key of ["bot", "github"]) {
    try {
      new URL(protocol.links?.[key]);
    } catch {
      throw new Error(`Invalid protocol field: links.${key}`);
    }
  }
  return protocol;
}

async function readJson(path, optional = false) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (optional && error.code === "ENOENT") return {};
    throw error;
  }
}

function expandLegacy(protocol) {
  if (!protocol.legacyDir) return protocol;
  const assets = Object.fromEntries(
    Object.entries(LEGACY_FILES).map(([id, file]) => {
      if (id === "logo") return [id, `${protocol.legacyDir}/${protocol.logoFile ?? file}`];
      const output = protocol.genericExtension && ["notion-cover", "partnership-banner"].includes(id)
        ? file.replace(/\.jpg$/, `.${protocol.genericExtension}`)
        : file;
      return [id, `${protocol.legacyDir}/${output}`];
    })
  );
  return merge({
    logo: `${protocol.legacyDir}/${protocol.logoFile ?? "logo.jpg"}`,
    assets,
    colors: {
      ...protocol.colors,
      telegramBotAccent: protocol.colors?.telegramBotAccent ?? protocol.colors?.telegramAccent
    },
    links: {
      bot: `https://t.me/${protocol.slug}`,
      github: `https://github.com/ofirYC/perpie-proposals/tree/master/${encodeURIComponent(protocol.legacyDir)}`
    },
    templates: {}
  }, protocol);
}

export async function loadProtocol(root, slug) {
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(slug)) {
    throw new Error("Protocol must use a safe lowercase slug");
  }
  const catalog = await readJson(join(root, "protocols/catalog.json"));
  const base = catalog.find(protocol => protocol.slug === slug);
  if (!base) throw new Error(`Unknown protocol: ${slug}`);
  const override = await readJson(join(root, `protocols/${slug}.json`), true);
  return validate(merge(expandLegacy(base), override));
}
