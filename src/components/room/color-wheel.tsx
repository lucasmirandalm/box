
"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent, KeyboardEvent } from "react";

type HSV = {
  h: number;
  s: number;
  v: number;
};

interface ColorWheelProps {
  color: string;
  onChange: (color: string) => void;
}

const clamp = (value: number) =>
  Math.max(0, Math.min(1, value));

function hsvToRgb({ h, s, v }: HSV) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;

    return Math.round(
      255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))
    );
  };

  return {
    r: f(5),
    g: f(3),
    b: f(1),
  };
}

function hsvToHex(hsv: HSV): string {
  const { r, g, b } = hsvToRgb(hsv);

  return (
    "#" +
    [r, g, b]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")
  ).toUpperCase();
}

function normalizeHex(hex: string): string | null {
  const value = hex.trim().replace(/^#/, "");

  if (!/^[0-9a-f]{6}$/i.test(value)) {
    return null;
  }

  return `#${value.toUpperCase()}`;
}

function hexToHsv(hex: string, previous?: HSV): HSV {
  const value = (normalizeHex(hex) ?? "#FF1152").slice(1);

  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = previous?.h ?? 0;

  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }

    h = (h * 60 + 360) % 360;
  }

  return {
    h,
    s: max === 0 ? previous?.s ?? 0 : delta / max,
    v: max,
  };
}

export default function ColorWheel({
  color,
  onChange,
}: ColorWheelProps) {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(color));

  const [hexInput, setHexInput] = useState(
    () => hsvToHex(hexToHsv(color))
  );

  const hsvRef = useRef(hsv);

  const hex = hsvToHex(hsv);
  const rgb = hsvToRgb(hsv);

  // Sincroniza mudanças externas, como o conta-gotas.
  useEffect(() => {
    const normalized = normalizeHex(color);

    if (!normalized || normalized === hsvToHex(hsvRef.current)) {
      return;
    }

    const next = hexToHsv(normalized, hsvRef.current);

    hsvRef.current = next;
    setHsv(next);
    setHexInput(normalized);
  }, [color]);

  function updateColor(next: HSV) {
    const previousHex = hsvToHex(hsvRef.current);
    const nextHex = hsvToHex(next);

    hsvRef.current = next;

    setHsv(next);
    setHexInput(nextHex);

    if (previousHex !== nextHex) {
      onChange(nextHex);
    }
  }

  function updateHue(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    const angle = Math.atan2(x, -y) * (180 / Math.PI);

    const hue = (angle + 360) % 360;

    updateColor({
      ...hsvRef.current,
      h: hue,
    });
  }

  function updateSaturationValue(
    event: PointerEvent<HTMLDivElement>
  ) {
    const rect = event.currentTarget.getBoundingClientRect();

    const saturation = clamp(
      (event.clientX - rect.left) / rect.width
    );

    const brightness = 1 - clamp(
      (event.clientY - rect.top) / rect.height
    );

    updateColor({
      ...hsvRef.current,
      s: saturation,
      v: brightness,
    });
  }

  function handleHuePointerDown(
    event: PointerEvent<HTMLDivElement>
  ) {
    if (event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    const distance = Math.hypot(x, y);

    // Ignora cliques na região interna da roda.
    if (distance < rect.width * 0.39) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    updateHue(event);
  }

  function handleHueKeyDown(
    event: KeyboardEvent<HTMLDivElement>
  ) {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : 0;

    if (!direction) return;

    event.preventDefault();

    updateColor({
      ...hsvRef.current,
      h: (hsvRef.current.h + direction * 2 + 360) % 360,
    });
  }

  function handleSquareKeyDown(
    event: KeyboardEvent<HTMLDivElement>
  ) {
    const next = { ...hsvRef.current };
    const step = 0.02;

    switch (event.key) {
      case "ArrowRight":
        next.s = clamp(next.s + step);
        break;
      case "ArrowLeft":
        next.s = clamp(next.s - step);
        break;
      case "ArrowUp":
        next.v = clamp(next.v + step);
        break;
      case "ArrowDown":
        next.v = clamp(next.v - step);
        break;
      default:
        return;
    }

    event.preventDefault();
    updateColor(next);
  }

  function handleHexChange(value: string) {
    setHexInput(value);

    const normalized = normalizeHex(value);

    if (normalized) {
      updateColor(hexToHsv(normalized, hsvRef.current));
    }
  }

  const angle = (hsv.h * Math.PI) / 180;

  const huePosition = {
    left: `${50 + 44.5 * Math.sin(angle)}%`,
    top: `${50 - 44.5 * Math.cos(angle)}%`,
  };

  return (
    <div className="w-full max-w-[280px] select-none rounded-xl border border-zinc-800 bg-[#18181b] p-4 text-zinc-100">

      {/* Cabeçalho */}
      <div className="mb-5 flex items-center justify-between">
        <span className="text-sm font-semibold">
          Cor do pincel
        </span>

        <span className="text-[10px] font-medium text-zinc-500">
          HSV
        </span>
      </div>

      {/* Roda de cores */}
      <div className="relative aspect-square w-full">

        {/* Anel cromático */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Matiz"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={Math.floor(hsv.h)}
          className="absolute inset-0 cursor-crosshair touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#ff1152]"
          style={{
            background: `conic-gradient(
              #ff0000,
              #ffff00,
              #00ff00,
              #00ffff,
              #0000ff,
              #ff00ff,
              #ff0000
            )`,
          }}
          onPointerDown={handleHuePointerDown}
          onPointerMove={(event) => {
            if (
              event.currentTarget.hasPointerCapture(
                event.pointerId
              )
            ) {
              updateHue(event);
            }
          }}
          onKeyDown={handleHueKeyDown}
        >
          {/* Centro escuro */}
          <div className="pointer-events-none absolute inset-[11%] rounded-full bg-[#18181b]" />

          {/* Seletor de matiz */}
          <div
            className="pointer-events-none absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_#000,0_2px_5px_#0008]"
            style={{
              ...huePosition,
              backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
            }}
          />
        </div>

        {/* Saturação e brilho */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Saturação e brilho. Use as setas horizontais para saturação e verticais para brilho."
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsv.s * 100)}
          aria-valuetext={`Saturação ${Math.round(hsv.s * 100)}%, brilho ${Math.round(hsv.v * 100)}%`}
          className="absolute left-[24%] top-[24%] z-20 h-[52%] w-[52%] cursor-crosshair touch-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff1152]"
          style={{
            backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;

            event.currentTarget.setPointerCapture(
              event.pointerId
            );

            updateSaturationValue(event);
          }}
          onPointerMove={(event) => {
            if (
              event.currentTarget.hasPointerCapture(
                event.pointerId
              )
            ) {
              updateSaturationValue(event);
            }
          }}
          onKeyDown={handleSquareKeyDown}
        >
          {/* Gradiente de saturação */}
          <div className="pointer-events-none absolute inset-0 rounded-sm bg-gradient-to-r from-white to-transparent" />

          {/* Gradiente de brilho */}
          <div className="pointer-events-none absolute inset-0 rounded-sm bg-gradient-to-t from-black to-transparent" />

          {/* Seletor da cor */}
          <div
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_#000]"
            style={{
              left: `${hsv.s * 100}%`,
              top: `${(1 - hsv.v) * 100}%`,
              backgroundColor: hex,
            }}
          />
        </div>
      </div>

      {/* Cor selecionada e hexadecimal */}
      <div className="mt-5 flex items-end gap-3">
        <div
          className="h-11 w-11 shrink-0 rounded-lg border border-white/15"
          style={{ backgroundColor: hex }}
          title={hex}
        />

        <div className="min-w-0 flex-1">
          <label
            htmlFor="brush-color-hex"
            className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500"
          >
            Hexadecimal
          </label>

          <input
            id="brush-color-hex"
            type="text"
            value={hexInput}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) =>
              handleHexChange(event.target.value)
            }
            onBlur={() =>
              setHexInput(hsvToHex(hsvRef.current))
            }
            className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 font-mono text-sm uppercase text-zinc-100 outline-none transition-colors focus:border-[#ff1152]"
          />
        </div>
      </div>

      {/* Valores RGB */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "R", value: rgb.r },
          { label: "G", value: rgb.g },
          { label: "B", value: rgb.b },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 py-2"
          >
            <span className="text-xs text-zinc-500">
              {label}
            </span>

            <span className="font-mono text-xs text-zinc-200">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
