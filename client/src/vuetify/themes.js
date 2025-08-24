/* eslint-disable quote-props */

export default {
  defaultTheme: "dark",
  themes: {
    dark: {
      colors: {
        // Primary UI: deep forest green (action buttons, highlights)
        primary: "#2E6A42",
        // Secondary / accents: mystical purple for magic/menus
        secondary: "#6B4B94",
        // Tertiary / subtle accents: warm teal for interest
        tertiary: "#4FA3A3",

        // Background tones (for overlays / panels)
        "surface": "#0F1B16",
        "surface-2": "#16261F",

        // Warm parchment/gold accents for actionable or important UI
        "accent-gold": "#D9A441",

        // Turn/flow indicators
        "turn-inactive": "#7E7E7E",
        "turn-active": "#D9A441",

        // Entity colors tuned for fantasy readability
        enemy: "#B33A3A",
        "enemy-border": "#D9534F",
        ally: "#3B82A1",
        "ally-border": "#5FB4D1",
        player: "#8BC34A",
        "player-border": "#B9F6AE",
      },
    },
  },
};
