const text = (content, link) => ({ type: "text", text: { content, link: link ? { url: link } : null } });
const paragraph = rich_text => ({ object: "block", type: "paragraph", paragraph: { rich_text } });
const heading = content => ({ object: "block", type: "heading_2", heading_2: { rich_text: [text(content)] } });
const image = (url, caption) => ({
  object: "block",
  type: "image",
  image: { type: "external", external: { url }, caption: [text(caption)] }
});
const embed = url => ({ object: "block", type: "embed", embed: { url } });

export function buildNotionPayload(protocol, parentId, publicBaseUrl, now = new Date()) {
  const base = publicBaseUrl.replace(/\/$/, "");
  const root = `${base}/${protocol.slug}`;
  const featureIds = ["partnership-banner", "groups", "selfcustody", "charts", "transactional-miniapp", "traders-tracker", "ai-feature", "notifications", "pnlcards", "batch-transactions", "referral-system"];
  return {
    parent: { page_id: parentId },
    icon: { type: "external", external: { url: `${root}/images/logo.png` } },
    cover: { type: "external", external: { url: `${root}/images/notion-cover.png` } },
    properties: {
      title: { type: "title", title: [text(`${protocol.name} Proposal — Draft ${now.toISOString().slice(0, 10)}`)] }
    },
    children: [
      heading(`${protocol.name} × Perpie`),
      paragraph([text(`A native, editable proposal for the ${protocol.name} whitelabel Telegram trading bot.`)]),
      heading("Partnership and product visuals"),
      ...featureIds.map(id => image(`${root}/images/${id}.png`, `${protocol.name}: ${id.replaceAll("-", " ")}`)),
      heading("Interactive galleries"),
      embed(`${root}/features.html`),
      embed(`${root}/social-features.html`),
      heading("Links"),
      paragraph([text("Open Telegram bot", protocol.links.bot), text(" · "), text("View generated assets on GitHub", protocol.links.github)])
    ]
  };
}

export async function createNotionDraft(protocol, options) {
  const { token, parentId, publicBaseUrl } = options;
  if (!token || !parentId || !publicBaseUrl) {
    throw new Error("NOTION_TOKEN, NOTION_PARENT_PAGE_ID, and PUBLIC_BASE_URL are required");
  }
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "notion-version": "2022-06-28"
    },
    body: JSON.stringify(buildNotionPayload(protocol, parentId, publicBaseUrl))
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? `Notion returned ${response.status}`);
  return result;
}
