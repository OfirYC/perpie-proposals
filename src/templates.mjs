const feature = (id, file, headline, layout = "split") => ({
  id,
  file,
  headline,
  layout,
  width: 1500,
  height: 640
});

const pivot = (id, headline, layout) => ({
  ...feature(id, "", headline, layout),
  defaultEnabled: false
});

export const TEMPLATES = [
  { id: "notion-cover", file: "notion-cover.jpg", headline: "", layout: "cover", width: 2170, height: 381 },
  feature("users-love-tg", "users-love-tg.jpg", "Users 🤝 Telegram Bots", "social"),
  feature("partnership-banner", "Partnership Baner.jpg", "", "partnership"),
  { id: "logo", file: "logo.jpg", headline: "", layout: "logo", width: 347, height: 347 },
  feature("groups", "groups.jpg", "Social Group Trading", "left"),
  feature("selfcustody", "selfcustody.jpg", "Intuitive Self Custody", "left"),
  feature("charts", "charts.jpg", "Interactive Charts", "right"),
  feature("transactional-miniapp", "transactional-miniapp.jpg", "Transactional Mini-App Usage", "top"),
  feature("traders-tracker", "traders-tracker.jpg", "Traders Tracker 🕵️", "top"),
  { ...feature("ai-feature", "ai-feature.jpg", "Just Say It", "top"), subheadline: "Taking intents to a whole 'nother level." },
  feature("notifications", "notifications.jpg", "Real-Time Notifications", "top"),
  feature("pnlcards", "pnlcards.jpg", "Shareable P&L Cards", "top"),
  feature("batch-transactions", "batch-transactions.jpg", "Batch Transactions", "left"),
  feature("referral-system", "referral-system.jpg", "Referral System", "left"),
  pivot("agent-everywhere", "One Agent. Every Surface.", "pivot-everywhere"),
  pivot("agent-telegram", "AI Agent Inside Telegram", "pivot-telegram"),
  pivot("embedded-agent", "Embedded AI Transaction Layer", "pivot-embedded"),
  pivot("alert-to-action", "From Alert to Action", "pivot-loop")
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
    .filter(template => protocol.templates?.[template.id]?.enabled ?? template.defaultEnabled ?? true)
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

const PIVOT_ASSETS = {
  perpie: "shared/pivot/perpie-lockup.png",
  phone: "shared/pivot/telegram-phone.png",
  input: "shared/pivot/telegram-input.png",
  position: "shared/pivot/position.png",
  positions: "shared/pivot/positions.png",
  transaction: "shared/pivot/transaction-card.png"
};

const DEFAULT_ART = {
  "users-love-tg": "shared/pivot/group-phone.png",
  groups: "shared/pivot/group-phone.png",
  selfcustody: "shared/pivot/telegram-phone.png",
  charts: "shared/pivot/position.png",
  "transactional-miniapp": "shared/pivot/transaction-card.png",
  "traders-tracker": "shared/pivot/group-phone.png",
  "ai-feature": "shared/pivot/transaction-card.png",
  notifications: "shared/pivot/positions.png",
  pnlcards: "shared/pivot/position.png",
  "batch-transactions": "shared/pivot/positions.png",
  "referral-system": "shared/pivot/transaction-card.png"
};

function renderPivot(template, common, headline, protocol, logo, name) {
  const assets = { ...PIVOT_ASSETS, ...(protocol.templates?.[template.id]?.assets ?? {}) };
  const title = `<h1>${escapeHtml(headline)}</h1>`;
  const phone = image(assets.phone, "Perpie AI agent in Telegram", "pivot-phone");
  const input = image(assets.input, "Telegram natural-language prompt", "pivot-input-image");
  const position = image(assets.position, "Reviewed protocol position", "pivot-position-image");
  const positions = image(assets.positions, "Active protocol positions", "pivot-positions-image");
  const transaction = image(assets.transaction, "Reviewed protocol transaction", "pivot-transaction-image");
  const brand = `<div class="pivot-brand">${logo}<strong>${name}</strong></div>`;

  if (template.layout === "pivot-everywhere") {
    return `<main class="proposal pivot pivot-agent-everywhere" ${common}>${title}<div class="pivot-desktop">${brand}<div class="pivot-desktop-copy"><span>Embedded AI Agent</span><strong>What can I do with my portfolio?</strong></div><div class="pivot-review">${transaction}<button>Review transaction</button></div><div class="pivot-composer">Ask, research, or execute…<span>↑</span></div></div><div class="pivot-phone-wrap">${phone}<span class="pivot-surface-tag">Telegram</span></div></main>`;
  }
  if (template.layout === "pivot-telegram") {
    return `<main class="proposal pivot pivot-agent-telegram" ${common}>${title}<p>Ask naturally. Review every action. Execute inside the conversation.</p><div class="pivot-telegram-stage"><div class="pivot-prompt">Open a 10× BTC long with 1,000 USDC</div>${transaction}<div class="pivot-confirm">✓ Review &amp; confirm</div>${input}</div><div class="pivot-phone-crop">${phone}</div></main>`;
  }
  if (template.layout === "pivot-embedded") {
    return `<main class="proposal pivot pivot-embedded-agent" ${common}>${title}<div class="pivot-terminal"><header>${brand}<nav>Trade&nbsp;&nbsp;&nbsp; Portfolio&nbsp;&nbsp;&nbsp; Markets</nav><span>Connect wallet</span></header><section class="pivot-market"><div class="pivot-market-head"><strong>BTC / USDC</strong><span>Market&nbsp;&nbsp; $64,281.40</span></div><div class="pivot-chart"><i></i><i></i><i></i><i></i><i></i><svg viewBox="0 0 700 210" preserveAspectRatio="none" aria-hidden="true"><path d="M0 170 C80 145 110 188 180 132 S290 104 340 118 S430 160 500 86 S610 72 700 22"/></svg></div>${positions}</section><aside><small>AI TRANSACTION AGENT</small><div class="pivot-user-message">Move 25% of my USDC into the best BTC setup.</div><div class="pivot-agent-message">I prepared a reviewed market action with your current wallet.</div>${transaction}<button>Review transaction</button></aside></div></main>`;
  }
  return `<main class="proposal pivot pivot-alert-loop" ${common}>${title}<div class="pivot-flow"><article><b>1</b><small>ALERT</small><strong>BTC moved above your target</strong>${positions}</article><span>→</span><article><b>2</b><small>INTENT</small><div class="pivot-flow-prompt">Open the setup with 1,000 USDC</div></article><span>→</span><article><b>3</b><small>REVIEW</small>${position}</article><span>→</span><article><b>4</b><small>EXECUTION</small><div class="pivot-fill">✓ Position opened</div><strong>Monitoring and follow-ups stay active.</strong></article></div><div class="pivot-loop-caption">Telegram or embedded chat → typed action → protocol execution → repeat engagement</div></main>`;
}

export function renderTemplate(id, protocol) {
  const template = TEMPLATES.find(item => item.id === id);
  if (!template) throw new Error(`Unknown template: ${id}`);
  const override = protocol.templates?.[id] ?? {};
  const headline = override.headline ?? template.headline;
  const subheadline = override.subheadline ?? template.subheadline;
  const asset = override.assets?.hero ?? protocol.assets?.[id];
  const name = escapeHtml(protocol.name);
  const logo = image(protocol.logo, `${protocol.name} logo`, "protocol-logo");
  const common = `data-template="${id}" data-protocol="${escapeHtml(protocol.slug)}" style="${brandStyle(protocol)}"`;

  if (template.layout.startsWith("pivot-")) {
    return renderPivot(template, common, headline, protocol, logo, name);
  }
  if (template.layout === "logo") {
    return `<main class="proposal logo-card" ${common}>${logo}</main>`;
  }
  if (template.layout === "cover") {
    const cover = asset ? image(asset, `${protocol.name} Telegram Bot`, "source-art") : "";
    return `<main class="proposal notion-cover" ${common}>${cover}<div class="cover-mask"></div><h1>${name}<br>Telegram Bot</h1></main>`;
  }
  if (template.layout === "partnership") {
    return `<main class="proposal partnership" ${common}>${image(PIVOT_ASSETS.perpie, "Perpie", "perpie-lockup")}<span class="partnership-x">×</span><div class="partner-lockup">${logo}<strong>${name}</strong></div></main>`;
  }
  const visual = asset
    ? image(asset, `${protocol.name} — ${headline}`, "source-art")
    : `<div class="generated-art">${image(DEFAULT_ART[id] ?? PIVOT_ASSETS.phone, `${protocol.name} product preview`, "generated-art-image")}<div class="generated-brand">${logo}<strong>${name}</strong></div></div>`;
  const subtitle = subheadline ? `<p class="feature-subtitle">${escapeHtml(subheadline)}</p>` : "";
  return `<main class="proposal feature ${template.layout}" ${common}>${visual}<div class="copy-mask"></div><h1>${escapeHtml(headline)}</h1>${subtitle}</main>`;
}
