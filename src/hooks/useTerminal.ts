import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke, Channel } from "@tauri-apps/api/core";
import "@xterm/xterm/css/xterm.css";

const textEncoder = new TextEncoder();
const FALLBACK_TERMINAL_FONT = 'Menlo, Monaco, "Courier New", monospace';
const STARTUP_COMMAND_IDLE_MS = 120;
const STARTUP_COMMAND_FALLBACK_MS = 400;

function readThemeVariable(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value || fallback;
}

function syncTerminalAppearance(term: Terminal) {
  const foreground = readThemeVariable("--terminal-foreground", "#d4d4d4");
  const selectionBackground = readThemeVariable(
    "--surface-active",
    "rgba(128, 128, 128, 0.28)",
  );

  term.options.fontFamily = readThemeVariable("--font-mono", FALLBACK_TERMINAL_FONT);
  term.options.theme = {
    background: readThemeVariable("--terminal-background", "#1e1e1e"),
    foreground,
    cursor: readThemeVariable("--terminal-cursor", foreground),
    selectionBackground,
    selectionInactiveBackground: selectionBackground,
  };

  term.refresh(0, Math.max(term.rows - 1, 0));
}

interface UseTerminalOptions {
  command?: string;
  fontSize?: number;
}

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
    const container = containerRef.current;
    if (!container) return;

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
        queueInput(options.command!);
      }, delay);
    }

    const term = new Terminal({
      cursorBlink: true,
      fontSize: options?.fontSize ?? 15,
      fontFamily: FALLBACK_TERMINAL_FONT,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    syncTerminalAppearance(term);
    fitAddon.fit();
    fitAddonRef.current = fitAddon;
    termRef.current = term;

    const onData = new Channel<number[]>();
    onData.onmessage = (data) => {
      if (alive) {
        term.write(new Uint8Array(data));

        if (options?.command && !startupCommandSent) {
          scheduleStartupCommand(STARTUP_COMMAND_IDLE_MS);
        }
      }
    };

    invoke<string>("spawn_terminal", {
      cwd,
      cols: term.cols,
      rows: term.rows,
      onData,
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

      // Auto-run command after shell initializes
      if (options?.command) {
        scheduleStartupCommand(STARTUP_COMMAND_FALLBACK_MS);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);

    const themeObserver = new MutationObserver(() => {
      syncTerminalAppearance(term);
      fitAddon.fit();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme-mode", "data-theme-template"],
    });

    return () => {
      alive = false;
      resizeObserver.disconnect();
      themeObserver.disconnect();
      if (inputFlushTimerRef.current !== null) {
        window.clearTimeout(inputFlushTimerRef.current);
        inputFlushTimerRef.current = null;
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

  // Re-fit when becoming active (container goes from display:none to block)
  useEffect(() => {
    if (active && fitAddonRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
      });
    }
  }, [active]);
}
