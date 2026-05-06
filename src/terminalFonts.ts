export const TERMINAL_FONT_STACKS = [
  {
    id: "default",
    name: "Default Mono",
    family:
      'Menlo, Monaco, "Courier New", "Symbols Nerd Font Mono", monospace',
  },
  {
    id: "nerd-font",
    name: "Nerd Font",
    family:
      '"JetBrainsMono Nerd Font Mono", "JetBrainsMonoNL Nerd Font Mono", "MesloLGS Nerd Font Mono", "FiraCode Nerd Font Mono", "CaskaydiaCove Nerd Font Mono", "Hack Nerd Font Mono", "Symbols Nerd Font Mono", Menlo, Monaco, "Courier New", monospace',
  },
] as const;

export type TerminalFontFamilyId = (typeof TERMINAL_FONT_STACKS)[number]["id"];

export const DEFAULT_TERMINAL_FONT_FAMILY_ID: TerminalFontFamilyId = "default";

export function isTerminalFontFamilyId(
  value: unknown,
): value is TerminalFontFamilyId {
  return (
    typeof value === "string" &&
    TERMINAL_FONT_STACKS.some((font) => font.id === value)
  );
}

export function getTerminalFontFamily(id: string) {
  return (
    TERMINAL_FONT_STACKS.find((font) => font.id === id) ??
    TERMINAL_FONT_STACKS.find(
      (font) => font.id === DEFAULT_TERMINAL_FONT_FAMILY_ID,
    )!
  );
}
