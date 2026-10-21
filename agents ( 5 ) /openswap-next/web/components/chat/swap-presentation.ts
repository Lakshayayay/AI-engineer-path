import { ICONS, type SwapIcon } from "./icons";

interface SwapPresentation {
  label?: string;
  icon?: SwapIcon;
}

// How each starter chip looks. A name with no entry shows as plain text.
export const SWAP_PRESENTATION: Record<string, SwapPresentation> = {
  Confluence: { icon: ICONS.confluence },
  Typeform: { icon: ICONS.typeform },
  ChatGPT: { icon: ICONS.openai },
  Claude: { icon: ICONS.anthropic },
  "Google Drive": { label: "Drive", icon: ICONS.google },
  "Google Analytics": { label: "Analytics", icon: ICONS.google },
  Notion: { icon: ICONS.notion },
  Dropbox: { icon: ICONS.dropbox },
  Firebase: { icon: ICONS.firebase },
  Shopify: { icon: ICONS.shopify },
  Trello: { icon: ICONS.trello },
  Airtable: { icon: ICONS.airtable },
  Calendly: { icon: ICONS.calendly },
  Discord: { icon: ICONS.discord },
  Intercom: { icon: ICONS.intercom },
  Mailchimp: { icon: ICONS.mailchimp },
  Miro: { icon: ICONS.miro },
  Obsidian: { icon: ICONS.obsidian },
  Zapier: { icon: ICONS.zapier },
  Zendesk: { icon: ICONS.zendesk },
};
