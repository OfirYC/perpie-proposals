const feature = (id, file, headline, layout = "split") => ({
  id,
  file,
  headline,
  layout,
  width: 1500,
  height: 640
});

export const TEMPLATES = [
  { id: "notion-cover", file: "notion-cover.jpg", headline: "", layout: "cover", width: 2170, height: 381 },
  feature("users-love-tg", "users-love-tg.jpg", "Users 🤝 Telegram Bots", "social"),
  feature("partnership-banner", "Partnership Baner.jpg", "", "partnership"),
  { id: "logo", file: "logo.jpg", headline: "", layout: "logo", width: 347, height: 347 },
  feature("groups", "groups.jpg", "Social Group Trading"),
  feature("selfcustody", "selfcustody.jpg", "Intuitive Self Custody", "reverse"),
  feature("charts", "charts.jpg", "Interactive Charts", "wide"),
  feature("transactional-miniapp", "transactional-miniapp.jpg", "Transactional Mini-App Usage", "wide"),
  feature("traders-tracker", "traders-tracker.jpg", "Traders Tracker 🕵️", "reverse"),
  feature("ai-feature", "ai-feature.jpg", "Just Say It", "center"),
  feature("notifications", "notifications.jpg", "Real-Time Notifications", "center"),
  feature("pnlcards", "pnlcards.jpg", "Shareable P&L Cards", "center"),
  feature("batch-transactions", "batch-transactions.jpg", "Batch Transactions"),
  feature("referral-system", "referral-system.jpg", "Referral System", "reverse")
];

const escapeHtml = value => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const url = path => `/${encodeURI(path).replaceAll("#", "%23")}`;

export function enabledTemplates(protocol) {
  return TEMPLATES
    .filter(template => protocol.templates?.[template.id]?.enabled !== false)
    .toSorted((a, b) => {
      const aOrder = protocol.templates?.[a.id]?.order ?? TEMPLATES.indexOf(a);
      const bOrder = protocol.templates?.[b.id]?.order ?? TEMPLATES.indexOf(b);
      return aOrder - bOrder;
    });
}

function brandStyle(protocol) {
  const { colors } = protocol;
  return [
    `--protocol-primary:${colors.primary}`,
    `--protocol-blur:${colors.blur}`,
    `--protocol-telegram-accent:${colors.telegramAccent}`,
    `--protocol-theme:${colors.theme}`,
    `--protocol-bot-accent:${colors.telegramBotAccent}`
  ].join(";");
}

function image(path, alt, className) {
  return `<img class="${className}" src="${url(path)}" alt="${escapeHtml(alt)}">`;
}

export function renderTemplate(id, protocol) {
  const template = TEMPLATES.find(item => item.id === id);
  if (!template) throw new Error(`Unknown template: ${id}`);
  const override = protocol.templates?.[id] ?? {};
  const headline = override.headline ?? template.headline;
  const asset = override.assets?.hero ?? protocol.assets?.[id] ?? protocol.logo;
  const name = escapeHtml(protocol.name);
  const logo = image(protocol.logo, `${protocol.name} logo`, "protocol-logo");
  const artwork = image(asset, `${protocol.name} — ${headline}`, "artwork-image");
  const common = `data-template="${id}" data-protocol="${escapeHtml(protocol.slug)}" style="${brandStyle(protocol)}"`;

  if (template.layout === "logo") {
    return `<main class="proposal logo-card" ${common}>${logo}</main>`;
  }
  if (template.layout === "cover") {
    return `<main class="proposal notion-cover" ${common}><div class="brand-lockup">${logo}<strong>${name}</strong></div><div class="cover-glow"></div></main>`;
  }
  if (template.layout === "partnership") {
    return `<main class="proposal partnership" ${common}><div class="perpie-lockup"><span class="hat">◢</span><strong>perpie</strong></div><span class="partnership-x">×</span><div class="partner-lockup">${logo}<strong>${name}</strong></div></main>`;
  }
  if (template.layout === "social") {
    return `<main class="proposal feature social" ${common}><h1>Users 🤝 ${name} Telegram Bots</h1><div class="artwork">${artwork}</div></main>`;
  }
  return `<main class="proposal feature ${template.layout}" ${common}><h1>${escapeHtml(headline)}</h1><div class="artwork">${artwork}</div><div class="corner-brand">${logo}<span>${name}</span></div></main>`;
}
