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

const telegramInput = () => `<div class="tg-input"><b>☰ Menu</b><span>⌕</span><em>ape 10x btc ASAP w all my USDC</em><i>↑</i></div>`;

const appHeader = (logo, name) => `<header>${logo}<strong>${name}</strong><span>•••</span></header>`;

const actionRows = () => `<div class="action-rows"><b>↩ Back</b><b>▣ Main Menu</b><strong>🔴 Close All</strong><span>💎 ARB | 💰$34.92 | ⏱18.3264x</span><span>💎 BTC | 💰$1.750 | ⏱2.1112x</span></div>`;

function phone(logo, name, content, className = "") {
  return `<div class="figma-phone ${className}"><div class="phone-screen">${appHeader(logo, name)}${content}<footer>☰ Menu　　◯　　⌁</footer></div></div>`;
}

const positionCard = (logo, name, compact = false) => `<article class="position-card${compact ? " compact" : ""}"><div>${logo}<strong>${name}</strong></div><b>💎 Position Details: WBTC</b><span>📊 Type:　　　　 Long</span><span>💰 Size:　　　　 $54.5660</span><span>🪙 Collateral:　 $10.9007</span><span>⚒ Leverage:　　 5.0057x</span></article>`;

const notification = (logo, name, text) => `<article class="notification-card">${logo}<div><b>${name}</b><span>${text}</span></div><small>now</small></article>`;

function figmaVisual(id, logo, name) {
  const chat = `<div class="chat"><i>Today</i><p>Welcome to ${name} — your personal trading atlas</p><p class="mine">check my position</p><p>🏆 Leaderboard<br>1) trader_one +58.5%<br>2) trader_two +42%</p></div>`;
  const trade = `${positionCard(logo, name, true)}${actionRows()}`;
  const success = `<div class="success"><b>✓</b><strong>Success!</strong><span>Sent Transaction Successfully</span></div>`;

  if (id === "users-love-tg") return `<div class="figma-art figma-social"><div class="social-card card-a">Natural-language trading</div><div class="social-card card-b">Self-custodial execution</div>${phone(logo, name, chat, "social-phone")}<div class="social-orb">🤝</div></div>`;
  if (id === "groups") return `<div class="figma-art figma-groups">${phone(logo, name, chat, "group-phone")}</div>`;
  if (id === "selfcustody") return `<div class="figma-art figma-selfcustody">${phone(logo, name, `<div class="login-preview"><div class="login-blur"></div><section><b>Choose Login</b><span>⌁<small>Passkey</small></span><span>G<small>Google</small></span></section></div>`, "custody-phone")}</div>`;
  if (id === "charts") return `<div class="figma-art figma-charts">${phone(logo, name, `<div class="chart-ui"><b>BTC / USDC</b><div class="candles"></div></div>`, "chart-phone chart-one")}${phone(logo, name, `<div class="chart-ui"><b>ETH / USDC</b><div class="candles alt"></div></div>`, "chart-phone chart-two")}</div>`;
  if (id === "transactional-miniapp") return `<div class="figma-art figma-transactional">${phone(logo, name, trade, "trade-phone")}${phone(logo, name, success, "success-phone")}<b class="flow-arrow">-&gt;</b></div>`;
  if (id === "traders-tracker") return `<div class="figma-art figma-tracker"><article class="tracker-card">${logo}<b>${name} | Your Tracked Traders</b><span>You can track other users or addresses and get notified about their actions.</span><em>1) @sifu<br>2) @perpiepa<br>3) 0x937...FD1</em>${actionRows()}</article><div class="brand-glyph">${logo}</div></div>`;
  if (id === "ai-feature") return `<div class="figma-art figma-ai">${positionCard(logo, name)}<button class="confirm">✓ Confirm</button><i class="ai-link">⌁</i>${telegramInput()}</div>`;
  if (id === "notifications") return `<div class="figma-art figma-notifications">${notification(logo, name, "💎 Position Details: WBTC")}${notification(logo, name, "✅ Opened WBTC Short")}${notification(logo, name, "↗ Order Details: Increase")}${notification(logo, name, "✳ Created WBTC Increase Order")}</div>`;
  if (id === "pnlcards") return `<div class="figma-art figma-pnl"><article class="pnl-card back-card"></article><article class="pnl-card mid-card"></article><article class="pnl-card front-card">${appHeader(logo, name)}<small>WBTCUSD　 Short　 x15.31</small><b>+24%</b><strong>$34,012</strong><strong>$36,932</strong><span>10% Off Fees　　▦</span></article></div>`;
  if (id === "batch-transactions") return `<div class="figma-art figma-batch">${actionRows()}</div>`;
  if (id === "referral-system") return `<div class="figma-art figma-referral"><div class="referral-ghost">/referrals</div><article class="referral-card">${appHeader(logo, name)}<b>📑 Your Referral Details</b><span>👥 Number of Referees: 37</span><span>💰 All-Time Earnings: $89,372</span><span>⏳ Pending Earnings: $2,862</span><span>🔗 Current Epoch: 40</span><span>◷ Next Payout In: 4 Days</span><code>/referral link: ${name.toLowerCase()}-bot</code>${actionRows()}</article></div>`;
  return `<div class="figma-art"></div>`;
}

function coverPhones(logo, name) {
  const content = `<div class="cover-chat"><p>Welcome to ${name}</p><p class="mine">Open my positions</p><p>Review and confirm your transaction.</p></div>`;
  return `${phone(logo, name, content, "cover-phone cover-phone-left")}${phone(logo, name, content, "cover-phone cover-phone-right")}`;
}

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
    const platform = protocol.templates?.[template.id]?.assets?.platform ?? protocol.platform;
    if (platform) {
      const step = text => `<li>${text}</li>`;
      const row = (k, v) => `<tr><th>${k}</th><td>${v}</td></tr>`;
      return `<main class="proposal pivot pivot-embedded-agent platform-mode" ${common}>${image(platform, `${protocol.name} platform`, "platform-shot")}<div class="platform-veil"></div>${title}<section class="agent-panel"><header><span class="agent-avatar">${logo}</span><span class="agent-id"><strong>${name}</strong><small><i></i>Trading agent · online</small></span><kbd>⌘K</kbd></header><div class="agent-thread"><p class="from-user">Put 25% of my USDC into BTC</p><div class="agent-steps"><b>Worked through 3 steps</b><ul>${step("Read wallet balances — 12,540 USDC idle")}${step("Compared BTC venues — best funding on WBTC")}${step("Simulated the transaction — no policy breach")}</ul></div><p class="from-agent">Here&rsquo;s the setup I&rsquo;d take — reviewed and ready to sign.</p><article class="agent-tx"><div class="tx-head"><span class="tx-token"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727"/></svg></span><span class="tx-pair"><strong>WBTC / USDC</strong><small>Perps · cross margin</small></span><span class="tx-side">LONG · 5×</span></div><table>${row("Collateral", "3,135.00 USDC")}${row("Est. entry", "$64,281.40")}${row("Liquidation", "$52,140.00")}</table><footer>Liquidation sits 19% below entry · stop loss attached</footer></article><div class="agent-actions"><button class="primary">Review &amp; sign</button><button class="ghost">Adjust size</button></div></div><div class="agent-composer"><span>Ask, research, or execute…</span><i>↑</i></div></section></main>`;
    }
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
    const cover = asset
      ? image(asset, `${protocol.name} Telegram Bot`, "source-art")
      : coverPhones(logo, name);
    const title = asset ? "" : `<h1>${name}<br>Telegram Bot</h1>`;
    return `<main class="proposal notion-cover" ${common}>${cover}${title}</main>`;
  }
  if (template.layout === "partnership") {
    // the designed banner blends Perpie's purple into the protocol's own colours,
    // which the flat two-stop CSS gradient cannot reproduce — prefer real artwork
    if (asset) {
      return `<main class="proposal partnership" ${common}>${image(asset, `Perpie × ${protocol.name}`, "source-art")}</main>`;
    }
    return `<main class="proposal partnership" ${common}>${image(PIVOT_ASSETS.perpie, "Perpie", "perpie-lockup")}<span class="partnership-x">×</span><div class="partner-lockup">${logo}<strong>${name}</strong></div></main>`;
  }
  const edited = Object.hasOwn(override, "headline") || Object.hasOwn(override, "subheadline") || override.assets?.visual;
  const useSource = asset && !edited;
  const visual = useSource
    ? image(asset, `${protocol.name} — ${headline}`, "source-art")
    : override.assets?.visual
      ? `<div class="generated-art">${image(override.assets.visual, `${protocol.name} product preview`, "generated-art-image")}<div class="generated-brand">${logo}<strong>${name}</strong></div></div>`
      : figmaVisual(id, logo, name);
  const title = useSource ? "" : `<h1>${escapeHtml(headline)}</h1>`;
  const subtitle = subheadline && !useSource ? `<p class="feature-subtitle">${escapeHtml(subheadline)}</p>` : "";
  return `<main class="proposal feature ${template.layout}" ${common}>${visual}${title}${subtitle}</main>`;
}
