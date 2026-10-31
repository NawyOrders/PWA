export const anchors = {
  menu: "menu",
  about: "about",
} as const;

export type AnchorName = keyof typeof anchors;
