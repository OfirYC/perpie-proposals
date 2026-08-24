# Perpie proposal generator

One protocol config produces the complete HTML proposal asset set, exact-size PNGs, two Notion-ready sliders, and an editable native Notion draft.

## Setup

```bash
npm ci
npx playwright install chromium
```

Preview a protocol while editing:

```bash
npm run serve
# http://localhost:4173/render/vertex/groups
```

Generate one protocol or every protocol:

```bash
npm run build -- vertex
npm run build -- --all
```

Output is written to `dist/<slug>/`. Each directory includes the generated PNGs, an image gallery, `features.html`, and `social-features.html`.

## Add a protocol

1. Put its logo in the repository, for example `my-protocol/logo.png`.
2. Add one entry to `protocols/catalog.json`:

```json
{
  "slug": "my-protocol",
  "name": "My Protocol",
  "logo": "my-protocol/logo.png",
  "colors": {
    "primary": "#7C5CFF",
    "blur": "#B29AFF",
    "telegramAccent": "#6A4CE0",
    "telegramBotAccent": "#6A4CE0",
    "theme": "#FFFFFF"
  },
  "links": {
    "bot": "https://t.me/my_protocol_bot",
    "github": "https://github.com/org/my-protocol"
  }
}
```

That is enough to generate every banner. Add optional protocol-specific copy or art in `protocols/<slug>.json`; it inherits everything else:

```json
{
  "assets": {
    "groups": "my-protocol/custom-groups.png"
  },
  "templates": {
    "groups": {
      "headline": "Trade together, directly from Telegram"
    },
    "charts": {
      "enabled": false
    }
  }
}
```

The supplied art is used only as the product-UI layer. Headlines, layout masks, logo, name, and colors are rendered from the protocol config, so changing brand variables regenerates the complete set without returning to Figma.

For a one-off layout adjustment, add `protocols/<slug>.css`. It is scoped to that protocol and loaded after the shared template CSS.

## Create the editable Notion draft

After GitHub Pages has published `dist/`, put these values in the gitignored `.env.local` file (or export them in your shell):

```dotenv
NOTION_TOKEN=ntn_...
NOTION_PARENT_PAGE_ID=...
PUBLIC_BASE_URL=https://ofiryc.github.io/perpie-proposals
```

Then create the draft:

```bash
npm run notion:create -- vertex
```

The command always creates a new native Notion page. Its headings, text, links, and image blocks remain editable in Notion; regenerating later creates another draft instead of overwriting manual edits.
