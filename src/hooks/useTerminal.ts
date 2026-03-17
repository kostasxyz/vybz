import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke, Channel } from "@tauri-apps/api/core";
import "@xterm/xterm/css/xterm.css";

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  cwd: string,
  active: boolean,
) {
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Spawn terminal on mount
  useEffect(() => {
    let alive = true;
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();
    fitAddonRef.current = fitAddon;

    const onData = new Channel<number[]>();
    onData.onmessage = (data) => {
      if (alive) {
        term.write(new Uint8Array(data));
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
        const bytes = Array.from(new TextEncoder().encode(data));
        invoke("write_to_terminal", { sessionId: id, data: bytes });
      });

      term.onResize(({ cols, rows }) => {
        invoke("resize_terminal", { sessionId: id, cols, rows });
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);

    return () => {
      alive = false;
      resizeObserver.disconnect();
      if (sessionIdRef.current) {
        invoke("kill_terminal", { sessionId: sessionIdRef.current });
      }
      term.dispose();
      fitAddonRef.current = null;
    };
  }, [cwd]);

  // Re-fit when becoming active (container goes from display:none to block)
  useEffect(() => {
    if (active && fitAddonRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
      });
    }
  }, [active]);
}
