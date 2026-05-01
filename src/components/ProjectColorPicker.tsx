import { useEffect, useMemo, useRef, useState } from "react";

interface HsvColor {
  h: number;
  s: number;
  v: number;
}

interface ProjectColorPickerProps {
  color: string;
  presets?: readonly string[];
  onChange: (color: string) => void;
  onPresetSelect?: () => void;
}

const DEFAULT_COLOR = "#61afef";
const HUE_SLIDER_GRADIENT =
  "linear-gradient(90deg, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHexColor(value: string) {
  const normalized = value.trim().replace(/^#/, "");

  if (/^[\da-fA-F]{3}$/.test(normalized)) {
    return `#${normalized
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toLowerCase()}`;
  }

  if (/^[\da-fA-F]{6}$/.test(normalized)) {
    return `#${normalized.toLowerCase()}`;
  }

  return null;
}

function hexToRgb(hex: string) {
  const parsed = parseInt(hex.slice(1), 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (channel: number) =>
    clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let h = 0;

  if (delta !== 0) {
    if (max === red) {
      h = ((green - blue) / delta) % 6;
    } else if (max === green) {
      h = (blue - red) / delta + 2;
    } else {
      h = (red - green) / delta + 4;
    }
  }

  return {
    h: (h * 60 + 360) % 360,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hexToHsv(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

function hsvToHex({ h, s, v }: HsvColor) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const value = clamp(v, 0, 1);
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = value - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = chroma;
  } else if (hue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return rgbToHex((red + match) * 255, (green + match) * 255, (blue + match) * 255);
}

function hueToHex(hue: number) {
  return hsvToHex({ h: hue, s: 1, v: 1 });
}

export function ProjectColorPicker({
  color,
  presets,
  onChange,
  onPresetSelect,
}: ProjectColorPickerProps) {
  const normalizedColor = normalizeHexColor(color) ?? DEFAULT_COLOR;
  const [hsv, setHsv] = useState(() => hexToHsv(normalizedColor));
  const [hexInput, setHexInput] = useState(normalizedColor);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const hsvRef = useRef(hsv);

  const currentHex = useMemo(() => hsvToHex(hsv), [hsv]);
  const hueColor = useMemo(() => hueToHex(hsv.h), [hsv.h]);

  useEffect(() => {
    hsvRef.current = hsv;
  }, [hsv]);

  useEffect(() => {
    if (normalizedColor !== currentHex) {
      const nextHsv = hexToHsv(normalizedColor);
      hsvRef.current = nextHsv;
      setHsv(nextHsv);
    }
  }, [currentHex, normalizedColor]);

  useEffect(() => {
    setHexInput(currentHex);
  }, [currentHex]);

  function commitColor(nextColor: HsvColor) {
    const normalized = {
      h: ((nextColor.h % 360) + 360) % 360,
      s: clamp(nextColor.s, 0, 1),
      v: clamp(nextColor.v, 0, 1),
    };

    hsvRef.current = normalized;
    setHsv(normalized);
    onChange(hsvToHex(normalized));
  }

  function updateFromSurface(clientX: number, clientY: number) {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    commitColor({
      ...hsvRef.current,
      s: clamp((clientX - rect.left) / rect.width, 0, 1),
      v: 1 - clamp((clientY - rect.top) / rect.height, 0, 1),
    });
  }

  function commitHexInput() {
    const nextColor = normalizeHexColor(hexInput);
    if (!nextColor) {
      setHexInput(currentHex);
      return;
    }

    commitColor(hexToHsv(nextColor));
  }

  return (
    <>
      {presets && presets.length > 0 && (
        <div className="color-swatches">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`color-swatch ${preset === currentHex ? "active" : ""}`}
              style={{ background: preset }}
              onClick={() => {
                const nextColor = normalizeHexColor(preset);
                if (!nextColor) {
                  return;
                }

                commitColor(hexToHsv(nextColor));
                onPresetSelect?.();
              }}
            />
          ))}
        </div>
      )}

      <div className="color-picker-editor">
        <div
          ref={surfaceRef}
          className="color-picker-surface"
          style={{ backgroundColor: hueColor }}
          onPointerDown={(event) => {
            draggingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromSurface(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (!draggingRef.current) {
              return;
            }

            updateFromSurface(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => {
            draggingRef.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={(event) => {
            draggingRef.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
        >
          <div className="color-picker-surface-light" />
          <div className="color-picker-surface-dark" />
          <div
            className="color-picker-surface-handle"
            style={{
              left: `${hsv.s * 100}%`,
              top: `${(1 - hsv.v) * 100}%`,
              background: currentHex,
            }}
          />
        </div>

        <div className="color-picker-controls">
          <div
            className="color-picker-preview"
            style={{ background: currentHex }}
            aria-hidden="true"
          />

          <div className="color-picker-field">
            <span className="color-picker-field-label">Hex</span>
            <input
              className="color-picker-hex-input"
              value={hexInput}
              onChange={(event) => setHexInput(event.target.value)}
              onBlur={commitHexInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitHexInput();
                }

                if (event.key === "Escape") {
                  setHexInput(currentHex);
                }
              }}
            />
          </div>
        </div>

        <div className="color-picker-field">
          <span className="color-picker-field-label">Hue</span>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            className="color-picker-hue-slider"
            style={{ background: HUE_SLIDER_GRADIENT }}
            value={Math.round(hsv.h)}
            onChange={(event) =>
              commitColor({
                ...hsvRef.current,
                h: Number(event.target.value),
              })
            }
          />
        </div>
      </div>
    </>
  );
}
