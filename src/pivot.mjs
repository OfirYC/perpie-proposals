// AI-pivot sections spliced into the cloned proposal.
//
// The original proposal is what closed clients, so it stays intact. These
// inserts add the product direction for the agent pivot, written in the same
// voice, and are anchored to headings in the source document.
//
// Spec shapes: {h2}, {h3}, {p}, {quote}, {ul:[...]}, {img}, {divider}
// Inline **bold** and *italic* are supported. {{PROTOCOL}} is interpolated.

export const PIVOT_SECTIONS = [
  {
    anchor: "Why Partner With Us",
    position: "before",
    blocks: [
      { h2: "The Internet Is Moving From Clicking To Asking" },
      { img: "agent-everywhere" },
      {
        p: "Think about how you used the internet two years ago versus today. You used to " +
           "*navigate* — open the app, find the right tab, fill the form, set the parameters, " +
           "click, confirm, repeat. Now? You just say what you want. “Book me a flight.” " +
           "“Summarise this thread.” “Fix this function.”"
      },
      {
        p: "This is the shift from **manual actions to intent**, and it is quietly eating every " +
           "interface on the internet. People are done operating software. They want to state the " +
           "outcome and let the software work out the steps."
      },
      {
        p: "Crypto is the single most painful place this hasn’t happened yet. Opening a leveraged " +
           "position today is: connect wallet → find the market → pick collateral → set leverage " +
           "→ set slippage → set stop loss → approve token → sign → wait → go check if it filled. " +
           "That is ten manual steps to express ONE intent: *“long BTC with 3k, don’t let me lose " +
           "more than $200.”*"
      },
      {
        p: "Enter Perpie. Your user says the sentence — inside {{PROTOCOL}} or inside Telegram — " +
           "and gets back a ready-to-sign transaction with the numbers already filled in. No menu " +
           "diving. No tab hunting. No ten steps."
      },
      {
        quote: "The protocols that win the next cycle won’t be the ones with the prettiest UI. " +
               "They’ll be the ones users never have to touch a UI to use."
      }
    ]
  },
  {
    anchor: "Trading Experience",
    position: "before",
    blocks: [
      { h3: "The AI Agent (Your New Front Door)" },
      { img: "agent-telegram" },
      {
        p: "The AI feature that used to be one line in this proposal is now the whole front door. " +
           "Same bot, same wallet, same security model — except the primary way your users interact " +
           "with {{PROTOCOL}} is by talking to it."
      },
      {
        ul: [
          "**Just Say It:** “ape 10x BTC with all my USDC”, “close everything that’s down”, " +
          "“what was my best trade this month?” — the agent parses it, checks it against live " +
          "{{PROTOCOL}} state, and comes back with a real transaction. No commands to memorise, " +
          "no menus to learn.",

          "**It Actually Knows Your Protocol:** Live markets, the user’s open positions, collateral, " +
          "funding, limits and available actions. The agent answers from {{PROTOCOL}}’s current " +
          "state — not from a docs page it read once.",

          "**Intent In, Typed Transaction Out:** The AI never gets a blank cheque. Every request is " +
          "converted into a *typed* protocol action, checked against policy, quoted, and shown to the " +
          "user for approval before anything is signed. Flexible conversation, boring predictable execution.",

          "**One Agent, Both Surfaces:** Drop it into your web app as an embedded chat and users get " +
          "the identical agent they already use in Telegram — same wallet, same permissions, same " +
          "history. Ship a capability once, it shows up in both places.",

          "**Alerts That Actually Do Something:** A notification stops being a dead end. Price hits the " +
          "level, the alert lands in Telegram, the user replies “take half off” — done, in the same " +
          "thread, in about five seconds.",

          "**Ready For The Other AIs:** An optional MCP endpoint so ChatGPT, Claude and friends can " +
          "query and act on {{PROTOCOL}} too. When your users start asking their assistant to trade, " +
          "{{PROTOCOL}} is already there."
        ]
      },
      { img: "embedded-agent" },
      {
        p: "Embedded in {{PROTOCOL}}’s own app: the user asks, the agent reads live protocol state, " +
           "and hands back a reviewed transaction next to the chart they were already looking at."
      },
      { img: "alert-to-action" },
      {
        p: "And the loop that keeps them coming back: signal → conversation → review → execution. " +
           "Every alert is one reply away from being a trade."
      }
    ]
  }
];

export const PIVOT_ASSETS = ["agent-everywhere", "agent-telegram", "embedded-agent", "alert-to-action"];
