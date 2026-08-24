const text = (content, link) => ({ type: "text", text: { content, link: link ? { url: link } : null } });
const paragraph = rich_text => ({ object: "block", type: "paragraph", paragraph: { rich_text } });
const heading = content => ({ object: "block", type: "heading_2", heading_2: { rich_text: [text(content)] } });
const image = (url, caption) => ({
  object: "block",
  type: "image",
  image: { type: "external", external: { url }, caption: caption ? [text(caption)] : [] }
});
const embed = url => ({ object: "block", type: "embed", embed: { url } });
const nativeBlock = block => {
  const allowed = ["heading_2", "heading_3", "paragraph", "bulleted_list_item"];
  if (!allowed.includes(block?.type) || typeof block.text !== "string" || !block.text.trim()) {
    throw new Error("Invalid protocol Notion block");
  }
  return { object: "block", type: block.type, [block.type]: { rich_text: [text(block.text)] } };
};

const copyRichText = richText => richText.map(item => {
  const copy = { type: item.type, annotations: item.annotations };
  copy[item.type] = item[item.type];
  return copy;
});

async function listChildren(id, headers) {
  const blocks = [];
  let cursor;
  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${encodeURIComponent(id)}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const response = await fetch(url, { headers });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? `Notion returned ${response.status}`);
    blocks.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

async function cloneChildren(id, headers, context) {
  const result = [];
  for (const block of await listChildren(id, headers)) {
    if (block.type === "synced_block") {
      result.push(...await cloneChildren(block.id, headers, context));
      continue;
    }
    const cloned = await cloneBlock(block, headers, context);
    if (cloned) result.push(cloned);
  }
  return result;
}

async function cloneBlock(block, headers, context) {
  const { type } = block;
  const source = block[type];
  if (type === "image") {
    const asset = context.images[context.imageIndex++];
    if (!asset) throw new Error("Original proposal has more images than notion.sourceImages");
    return image(`${context.root}/images/${asset}.png?v=${context.version}`, "");
  }
  if (type === "embed") {
    const url = source.url.includes("perpie-proposals/features.html")
      ? `${context.root}/features.html`
      : source.url.includes("perpie-proposals/social-features.html")
        ? `${context.root}/social-features.html`
        : source.url;
    return embed(url);
  }
  if (type === "divider") return { object: "block", type, divider: {} };
  if (!["paragraph", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item"].includes(type)) return null;
  const content = {
    rich_text: copyRichText(source.rich_text ?? []),
    color: source.color ?? "default"
  };
  if (block.has_children) content.children = await cloneChildren(block.id, headers, context);
  return { object: "block", type, [type]: content };
}

export function buildNotionPayload(protocol, parentId, publicBaseUrl, now = new Date()) {
  const base = publicBaseUrl.replace(/\/$/, "");
  const root = `${base}/${protocol.slug}`;
  const version = now.getTime();
  const featureIds = ["partnership-banner", "groups", "selfcustody", "charts", "transactional-miniapp", "traders-tracker", "ai-feature", "notifications", "pnlcards", "batch-transactions", "referral-system"];
  return {
    parent: { page_id: parentId },
    icon: { type: "external", external: { url: `${root}/images/logo.png?v=${version}` } },
    cover: { type: "external", external: { url: `${root}/images/notion-cover.png?v=${version}` } },
    properties: {
      title: { type: "title", title: [text(protocol.notion?.title ?? `${protocol.name} Proposal — Draft ${now.toISOString().slice(0, 10)}`)] }
    },
    children: [
      heading(`${protocol.name} × Perpie`),
      paragraph([text(`A native, editable proposal for the ${protocol.name} whitelabel Telegram trading bot.`)]),
      heading("Partnership and product visuals"),
      ...featureIds.map(id => image(`${root}/images/${id}.png`, `${protocol.name}: ${id.replaceAll("-", " ")}`)),
      heading("Interactive galleries"),
      embed(`${root}/features.html`),
      embed(`${root}/social-features.html`),
      ...(protocol.notion?.blocks ?? []).map(nativeBlock),
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
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "notion-version": "2022-06-28"
  };
  const now = new Date();
  const payload = buildNotionPayload(protocol, parentId, publicBaseUrl, now);
  if (protocol.notion?.sourcePageId) {
    const context = {
      root: `${publicBaseUrl.replace(/\/$/, "")}/${protocol.slug}`,
      version: now.getTime(),
      images: protocol.notion.sourceImages ?? [],
      imageIndex: 0
    };
    payload.children = await cloneChildren(protocol.notion.sourcePageId, headers, context);
    if (context.imageIndex !== context.images.length) {
      throw new Error("notion.sourceImages does not match the original proposal image count");
    }
  }
  const remaining = payload.children.splice(100);
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? `Notion returned ${response.status}`);
  for (let index = 0; index < remaining.length; index += 100) {
    const appended = await fetch(`https://api.notion.com/v1/blocks/${encodeURIComponent(result.id)}/children`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ children: remaining.slice(index, index + 100) })
    });
    const appendResult = await appended.json();
    if (!appended.ok) throw new Error(appendResult.message ?? `Notion returned ${appended.status}`);
  }
  return result;
}
