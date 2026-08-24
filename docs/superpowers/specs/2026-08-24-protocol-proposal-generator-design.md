# Protocol Proposal Generator Design

## Goal

Replace the manual Figma export workflow with a code-owned proposal system where one protocol configuration produces all branded banners, a hosted proposal directory, and a native editable Notion proposal page.

## Current State

- The Figma file contains 14 proposal assets: `notion-cover`, `users-love-tg`, `Partnership Baner`, `logo`, `groups`, `selfcustody`, `charts`, `transactional-miniapp`, `traders-tracker`, `ai-feature`, `notifications`, `pnlcards`, `batch-transactions`, and `referral-system`.
- Figma uses shared `Primary`, `Blur`, `Name`, `Telegram Accent`, `theme`, `logo`, and `Telegram Bot Accent` variables.
- The repository contains one folder per protocol with exported images.
- `features.html` and `social-features.html` select those image folders using `?protocolName=<folder>`.
- Creating a protocol currently requires editing Figma variables, exporting images, uploading a directory, duplicating a Notion page, and manually replacing names, images, and links.

## Chosen Approach

Use a static HTML/CSS/JavaScript renderer driven by one JSON file per protocol. A small Node.js command validates the configuration, builds the protocol directory, and uses Playwright to capture the 14 HTML templates as images. A separate Node.js command creates a native Notion page from the same configuration and hosted image URLs.

This keeps the public output compatible with GitHub Pages, keeps Notion native and editable, and introduces only one development dependency: Playwright for deterministic browser screenshots.

## Repository Structure

```text
protocols/
  vertex/
    protocol.json
    logo.svg
    assets/
    overrides.css
src/
  content.json
  proposal.html
  proposal.css
  proposal.js
  templates.js
scripts/
  build.mjs
  notion.mjs
  serve.mjs
dist/
  vertex/
    index.html
    features.html
    social-features.html
    images/
      notion-cover.png
      groups.png
      ...
tests/
  build.test.mjs
```

`dist/` is generated. Source templates and protocol configuration are never duplicated between protocols.

## Protocol Configuration

Each `protocol.json` provides the protocol identity and only the content that differs from the defaults:

```json
{
  "slug": "vertex",
  "name": "Vertex",
  "botName": "Vertex bot",
  "logo": "logo.svg",
  "colors": {
    "primary": "#121312",
    "blur": "#153e39",
    "telegramAccent": "#118263",
    "theme": "#ffffff",
    "telegramBotAccent": "#f7baba"
  },
  "links": {
    "bot": "https://t.me/example_bot",
    "github": "https://github.com/ofirYC/perpie-proposals"
  },
  "templates": {
    "groups": {
      "headline": "Social Group Trading",
      "assets": {
        "hero": "assets/groups-vertex.png"
      }
    },
    "ai-feature": {
      "headline": "Trade Vertex in plain English"
    }
  }
}
```

Required fields are `slug`, `name`, `logo`, all five colors, and both links. Unknown template names, missing files, invalid colors, unsafe slugs, and duplicate slugs fail the build with a direct error message.

## Inheritance and Protocol-Specific Changes

`src/content.json` contains the default copy and asset slot names for every template. The renderer applies values in this order:

1. Shared template defaults.
2. Protocol identity, colors, logo, and links.
3. `templates.<template-id>` copy, asset, visibility, order, and layout-variant overrides.
4. Optional protocol `overrides.css`, loaded last and scoped under `[data-protocol="<slug>"]`.

This supports research-led protocol positioning without forking the shared templates. A protocol may change wording, replace screenshots, hide or reorder a banner, select an existing layout variant, or make a genuinely bespoke visual adjustment in its scoped stylesheet. Everything else continues to inherit future template fixes.

Manual edits made after Notion generation are allowed, but they do not flow back into `protocol.json`. Reusable research and positioning changes should therefore be recorded in the protocol configuration; one-off finishing edits can remain in Notion.

## HTML Rendering

`proposal.html` reads the protocol data embedded by the build command and renders a requested template selected by URL or build context. Each template is a function in `templates.js` that returns semantic HTML using shared CSS variables:

```css
--protocol-primary
--protocol-blur
--protocol-telegram-accent
--protocol-theme
--protocol-telegram-bot-accent
```

The original Avenir assets in the workspace are copied into the project and served locally so screenshots do not depend on Google Fonts or another network request. Figma-exported images and vectors used inside the compositions are committed under shared assets; protocol screenshots live under that protocol's `assets/` directory.

Templates render at their Figma dimensions. Proposal banners use 1500×640 pixels, `notion-cover` uses 2170×381 pixels, the chart uses 3840×2160 pixels, and `logo` uses 347×347 pixels.

## Build Command

```bash
npm run build -- vertex
```

The command:

1. Reads and validates `protocols/vertex/protocol.json`.
2. Starts the local static server on an available loopback port.
3. Renders every enabled template in Chromium.
4. Writes PNG files and the protocol HTML pages to `dist/vertex/`.
5. Writes a manifest containing template IDs, dimensions, source asset hashes, and output paths.
6. Exits non-zero if an asset is missing, a page fails to render, or an output has the wrong dimensions.

`npm run build -- --all` builds every protocol directory. GitHub Pages publishes `dist/`, yielding stable URLs such as:

```text
/vertex/
/vertex/images/notion-cover.png
/vertex/features.html
/vertex/social-features.html
```

The two slider pages use local protocol images and contain accessible previous/next buttons. They do not load Font Awesome or other third-party runtime resources.

## Native Notion Generation

```bash
npm run notion:create -- vertex
```

The command uses Node's built-in `fetch` with `NOTION_TOKEN`, `NOTION_PARENT_PAGE_ID`, and `PUBLIC_BASE_URL` environment variables. It creates a native Notion child page containing:

1. Protocol title and generated cover.
2. Introductory native heading and paragraph blocks.
3. Native image blocks for partnership and feature banners.
4. Native headings between feature groups.
5. The two hosted slider embeds.
6. Native links to the Telegram bot and GitHub directory.

The command only creates pages. If a page for the slug already exists, it creates a new page titled `<Protocol> Proposal — Draft <date>` and returns both page URLs. It never overwrites an edited Notion page.

An explicit destructive command is required to replace an existing generated page:

```bash
npm run notion:replace -- vertex --page <notion-page-id> --force
```

The replacement command rejects requests without both `--page` and `--force`. It replaces only pages named for the same protocol slug.

The existing reference Notion page is not required at runtime. Its final content can be translated into `src/content.json` after the connected Notion integration is granted access; the generator's block structure remains code-owned and deterministic.

## Editing Workflow

To add a protocol:

1. Create `protocols/<slug>/protocol.json`.
2. Add its logo and any protocol-specific screenshots.
3. Run the build command.
4. Review the generated HTML and PNG contact sheet.
5. Deploy `dist/`.
6. Run the Notion creation command.
7. Make any final native edits in Notion.

To change positioning for one protocol, edit only its template override. To change every protocol, edit the shared template or default content once.

## Error Handling

- Configuration errors identify the exact JSON path and expected value.
- Missing assets identify the protocol, template, and missing relative path.
- Browser console errors fail the corresponding template render.
- Screenshot dimension mismatches fail the build.
- Notion authentication, permission, rate-limit, and invalid-parent responses are reported without modifying local output.
- A failed Notion creation may leave a partial new draft; the command reports its URL and never retries by creating a second page automatically.

## Verification

One Node test file covers configuration merging, validation, template ordering, disabled templates, safe slug handling, and generated route paths. It uses Node's built-in test runner.

Playwright screenshots for Vertex are compared with the current Figma exports using a small pixel-difference threshold. Every generated protocol is also checked for the required file set and exact dimensions. The build command is the final integration check.

## Scope Boundaries

- No admin dashboard in the first version; JSON, assets, and optional CSS are the editing interface.
- No database; Git remains the source of truth.
- No two-way Notion synchronization; manual Notion edits remain in Notion.
- No Figma API dependency at runtime; Figma is the visual source used during the initial HTML port and later design reviews.
- No per-protocol template copies; protocol differences use configuration, assets, and scoped CSS only.
