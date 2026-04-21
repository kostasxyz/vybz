import { ShiftEnterMode, Tab, ToolConfig } from "./types";

/**
 * Tabs store the raw string that was typed into the PTY (including the
 * trailing carriage return) as `tab.command`. Built-in and user-defined
 * tools are identified by `tool.cmd`. We lookup by the same shape.
 */
function commandKeyForTool(tool: ToolConfig): string | null {
  return tool.cmd ? `${tool.cmd}\r` : null;
}

/**
 * Map of the exact `tab.command` string → `ToolConfig`. Only tools whose
 * `cmd` is set are included. A tab launched by "Run Command" with extra
 * arguments (e.g. `pi --model foo\r`) won't resolve here — that's the
 * same limitation the existing UI tool-icon lookup has.
 */
export function buildCommandToToolMap(
  tools: ToolConfig[],
): Map<string, ToolConfig> {
  const map = new Map<string, ToolConfig>();

  for (const tool of tools) {
    const key = commandKeyForTool(tool);

    if (key) {
      map.set(key, tool);
    }
  }

  return map;
}

/**
 * Resolve the tool associated with a tab. A tab with no command is a
 * Shell tab.
 */
export function resolveTabTool(
  tab: Tab,
  tools: ToolConfig[],
  commandToTool?: ReadonlyMap<string, ToolConfig>,
): ToolConfig | undefined {
  if (!tab.command) {
    return tools.find((tool) => tool.id === "shell");
  }

  if (commandToTool) {
    return commandToTool.get(tab.command);
  }

  return buildCommandToToolMap(tools).get(tab.command);
}

// Legacy encoding: ESC + CR. Interpreted as Alt+Enter by most TUI input
// parsers. Claude Code, Codex, OpenCode, etc. treat this as "newline".
const LEGACY_ALT_ENTER_SEQUENCE = "\x1b\r";

// xterm modifyOtherKeys encoding of Shift+Enter: CSI 27 ; 2 ; 13 ~
// Modifier 2 = Shift, codepoint 13 = Enter. Pi's pi-tui parser matches
// this pattern via `matchesModifyOtherKeys(data, CODEPOINTS.enter,
// MODIFIERS.shift)`.
const MODIFY_OTHER_KEYS_SHIFT_ENTER_SEQUENCE = "\x1b[27;2;13~";

export function shiftEnterSequenceForMode(mode: ShiftEnterMode): string {
  switch (mode) {
    case "modifyOtherKeys":
      return MODIFY_OTHER_KEYS_SHIFT_ENTER_SEQUENCE;
    case "legacyAltEnter":
    default:
      return LEGACY_ALT_ENTER_SEQUENCE;
  }
}

/**
 * Derive the byte sequence to emit when the user presses Shift+Enter
 * inside a terminal running `tool`. Falls back to the legacy Alt+Enter
 * encoding for unknown tools so behavior doesn't silently change for
 * user-defined tools that existed before the field was introduced.
 */
export function shiftEnterSequenceForTool(
  tool: ToolConfig | undefined,
): string {
  return shiftEnterSequenceForMode(tool?.shiftEnterMode ?? "legacyAltEnter");
}
