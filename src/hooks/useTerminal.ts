import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke, Channel } from "@tauri-apps/api/core";
import "@xterm/xterm/css/xterm.css";
import { useAppSelector } from "../context";
import { getTerminalTheme } from "../themes";
import { getTerminalFontFamily } from "../terminalFonts";

const textEncoder = new TextEncoder();
const STARTUP_COMMAND_IDLE_MS = 120;
const STARTUP_COMMAND_FALLBACK_MS = 400;
const STARTUP_REVEAL_FALLBACK_MS = 3000;

// DEC private mode sequence for switching to the alternate screen buffer
// (ESC [ ? 1 0 4 9 h). TUI tools like Claude Code, Codex, etc. emit this
// as soon as they take over the screen — we use it as our signal that the
// tool is fully rendered and it's safe to reveal the terminal.
const ALT_SCREEN_ENABLE_SEQUENCE = new Uint8Array([
  0x1b, 0x5b, 0x3f, 0x31, 0x30, 0x34, 0x39, 0x68,
]);

function containsSequence(haystack: Uint8Array, needle: Uint8Array) {
  if (needle.length === 0 || haystack.length < needle.length) {
    return false;
  }
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        continue outer;
      }
    }
    return true;
  }
  return false;
}

function concatBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length === 0) {
    return right;
  }

  const combined = new Uint8Array(left.length + right.length);
  combined.set(left);
  combined.set(right, left.length);
  return combined;
}

function normalizeProgrammaticInput(input: string) {
  return input.replace(/\r?\n/g, "\r");
}

interface UseTerminalOptions {
  command?: string;
  execCommand?: boolean;
  fontSize?: number;
  fontFamily?: string;
  /**
   * Bytes to emit when the user presses Shift+Enter. Defaults to
   * `\x1b\r` (legacy Alt+Enter), which most Ink-based TUIs (Claude Code,
   * Codex, OpenCode) treat as "insert newline". Tools that require the
   * xterm modifyOtherKeys encoding (e.g. Pi) override via their
   * `ToolConfig.shiftEnterMode`.
   */
  shiftEnterSequence?: string;
  onExit?: () => void;
}

const DEFAULT_SHIFT_ENTER_SEQUENCE = "\x1b\r";

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  cwd: string,
  active: boolean,
  options?: UseTerminalOptions,
) {
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputBufferRef = useRef("");
  const inputFlushTimerRef = useRef<number | null>(null);
  const commandTimerRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const shiftEnterSequenceRef = useRef(
    options?.shiftEnterSequence ?? DEFAULT_SHIFT_ENTER_SEQUENCE,
  );
  shiftEnterSequenceRef.current =
    options?.shiftEnterSequence ?? DEFAULT_SHIFT_ENTER_SEQUENCE;
  const hasStartupCommand = Boolean(options?.command);
  const [loadingStartup, setLoadingStartup] = useState(hasStartupCommand);
  const terminalThemeId = useAppSelector((state) => state.activeTerminalThemeId);
  const baseTerminalTheme = getTerminalTheme(terminalThemeId).theme;
  // The chrome layer paints --terminal-background, so xterm itself must be
  // fully transparent. This lets the optional background image show through.
  const terminalTheme = { ...baseTerminalTheme, background: "rgba(0, 0, 0, 0)" };

  function flushInputBuffer() {
    const sessionId = sessionIdRef.current;
    const input = inputBufferRef.current;

    if (!sessionId || !input) {
      return;
    }

    inputBufferRef.current = "";
    void invoke("write_to_terminal", {
      sessionId,
      data: Array.from(textEncoder.encode(input)),
    });
  }

  function queueInput(input: string) {
    inputBufferRef.current += input;

    if (inputFlushTimerRef.current !== null) {
      return;
    }

    inputFlushTimerRef.current = window.setTimeout(() => {
      inputFlushTimerRef.current = null;
      flushInputBuffer();
    }, 0);
  }

  // Spawn terminal on mount
  useEffect(() => {
    let alive = true;
    let startupCommandSent = false;
    let revealed = !hasStartupCommand;
    let revealFallbackTimer: number | null = null;
    let outputDetectionTail = new Uint8Array(0);
    let exitHandled = false;
    const container = containerRef.current;
    if (!container) return;

    function reveal() {
      if (revealed || !alive) return;
      revealed = true;
      if (revealFallbackTimer !== null) {
        window.clearTimeout(revealFallbackTimer);
        revealFallbackTimer = null;
      }
      setLoadingStartup(false);
    }

    function clearStartupCommandTimer() {
      if (commandTimerRef.current !== null) {
        window.clearTimeout(commandTimerRef.current);
        commandTimerRef.current = null;
      }
    }

    function scheduleStartupCommand(delay: number) {
      if (!options?.command || startupCommandSent) {
        return;
      }

      clearStartupCommandTimer();
      commandTimerRef.current = window.setTimeout(() => {
        commandTimerRef.current = null;

        if (!alive || !sessionIdRef.current || startupCommandSent) {
          return;
        }

        startupCommandSent = true;
        queueInput(normalizeProgrammaticInput(options.command!));

        // Fallback in case the tool doesn't enter the alt-screen buffer —
        // reveal after a grace period so non-TUI commands aren't stuck
        // behind the loading overlay forever.
        if (revealFallbackTimer === null && !revealed) {
          revealFallbackTimer = window.setTimeout(() => {
            revealFallbackTimer = null;
            reveal();
          }, STARTUP_REVEAL_FALLBACK_MS);
        }
      }, delay);
    }

    const term = new Terminal({
      cursorBlink: true,
      fontSize: options?.fontSize ?? 15,
      fontFamily:
        options?.fontFamily ?? getTerminalFontFamily("default").family,
      theme: terminalTheme,
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();
    fitAddonRef.current = fitAddon;
    termRef.current = term;

    term.attachCustomKeyEventHandler((event) => {
      if (
        event.type === "keydown" &&
        event.key === "Enter" &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        queueInput(shiftEnterSequenceRef.current);
        return false;
      }
      return true;
    });

    const execMode = Boolean(options?.execCommand && options?.command);

    const onData = new Channel<number[]>();
    const onExit = new Channel<boolean>();
    onData.onmessage = (data) => {
      if (alive) {
        const bytes = new Uint8Array(data);
        const bytesForDetection = concatBytes(outputDetectionTail, bytes);
        const sawAltScreen = containsSequence(
          bytesForDetection,
          ALT_SCREEN_ENABLE_SEQUENCE,
        );
        const detectionTailLength = Math.max(
          ALT_SCREEN_ENABLE_SEQUENCE.length - 1,
          0,
        );

        outputDetectionTail =
          detectionTailLength === 0
            ? new Uint8Array(0)
            : bytesForDetection.slice(-detectionTailLength);

        term.write(bytes);

        // In interactive-shell mode we wait for the shell to settle before
        // typing the startup command into the PTY. In exec mode the tool
        // is already the PTY's root process so there's nothing to schedule.
        if (!execMode && options?.command && !startupCommandSent) {
          scheduleStartupCommand(STARTUP_COMMAND_IDLE_MS);
        }

        // Wait for the tool to switch into the alternate screen buffer
        // before revealing. This keeps any shell startup noise hidden
        // behind the overlay even in exec mode.
        if (!revealed && sawAltScreen) {
          reveal();
        }
      }
    };
    onExit.onmessage = () => {
      if (!alive || exitHandled) {
        return;
      }

      exitHandled = true;
      clearStartupCommandTimer();
      if (revealFallbackTimer !== null) {
        window.clearTimeout(revealFallbackTimer);
        revealFallbackTimer = null;
      }
      setLoadingStartup(false);
      options?.onExit?.();
    };

    invoke<string>("spawn_terminal", {
      cwd,
      cols: term.cols,
      rows: term.rows,
      startupCommand: execMode ? options?.command : null,
      onData,
      onExit,
    }).then((id) => {
      if (!alive) {
        invoke("kill_terminal", { sessionId: id });
        return;
      }
      sessionIdRef.current = id;

      term.onData((data) => {
        queueInput(data);
      });

      term.onResize(({ cols, rows }) => {
        void invoke("resize_terminal", { sessionId: id, cols, rows });
      });

      // Interactive-shell mode only: type the startup command into the
      // shell after it has had a chance to draw its prompt. Exec mode
      // already runs the command as the PTY's root process.
      if (!execMode && options?.command) {
        scheduleStartupCommand(STARTUP_COMMAND_FALLBACK_MS);
      } else if (execMode) {
        // Safety net in case the tool produces no output for a while —
        // don't leave the overlay stuck.
        if (revealFallbackTimer === null && !revealed) {
          revealFallbackTimer = window.setTimeout(() => {
            revealFallbackTimer = null;
            reveal();
          }, STARTUP_REVEAL_FALLBACK_MS);
        }
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);

    return () => {
      alive = false;
      resizeObserver.disconnect();
      if (inputFlushTimerRef.current !== null) {
        window.clearTimeout(inputFlushTimerRef.current);
        inputFlushTimerRef.current = null;
      }
      if (revealFallbackTimer !== null) {
        window.clearTimeout(revealFallbackTimer);
        revealFallbackTimer = null;
      }
      clearStartupCommandTimer();
      inputBufferRef.current = "";
      if (sessionIdRef.current) {
        void invoke("kill_terminal", { sessionId: sessionIdRef.current });
        sessionIdRef.current = null;
      }
      term.dispose();
      fitAddonRef.current = null;
      termRef.current = null;
    };
  }, [cwd]);

  // Reactive font size updates (no respawn)
  useEffect(() => {
    const term = termRef.current;
    if (term && options?.fontSize) {
      term.options.fontSize = options.fontSize;
      fitAddonRef.current?.fit();
    }
  }, [options?.fontSize]);

  // Reactive font family updates (no respawn)
  useEffect(() => {
    const term = termRef.current;
    if (term && options?.fontFamily) {
      term.options.fontFamily = options.fontFamily;
      fitAddonRef.current?.fit();
    }
  }, [options?.fontFamily]);

  // Reactive terminal theme updates (no respawn). baseTerminalTheme is a
  // stable object reference per theme id, so this only fires when the user
  // picks a different terminal theme.
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.theme = { ...baseTerminalTheme, background: "rgba(0, 0, 0, 0)" };
    term.refresh(0, Math.max(term.rows - 1, 0));
  }, [baseTerminalTheme]);

  // Re-fit when becoming active (container goes from display:none to block)
  useEffect(() => {
    if (active && fitAddonRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
        termRef.current?.focus();
      });
    }
  }, [active]);

  return { loadingStartup };
}
