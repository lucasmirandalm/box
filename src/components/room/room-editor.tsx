"use client";

import {
  Brush,
  Eraser,
  LogOut,
  Minus,
  Plus,
} from "lucide-react";
import Link from "next/link";
import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type RoomEditorProps = {
  roomCode: string;
  userName: string;
  avatarUrl: string | null;
};

type Tool = "brush" | "eraser";

const MIN_ZOOM = 25;
const MAX_ZOOM = 300;
const ZOOM_STEP = 10;

export default function RoomEditor({
  roomCode,
  userName,
  avatarUrl,
}: RoomEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(
    null,
  );

  const [tool, setTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(8);
  const [eraserSize, setEraserSize] = useState(30);
  const [color, setColor] = useState("#111111");
  const [zoom, setZoom] = useState(100);

  const userInitial = userName.charAt(0).toUpperCase();

  const currentSize =
    tool === "brush" ? brushSize : eraserSize;

  useEffect(() => {
    const workspace = workspaceRef.current;

    if (!workspace) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();

      setZoom((currentZoom) => {
        if (event.deltaY < 0) {
          return Math.min(
            currentZoom + ZOOM_STEP,
            MAX_ZOOM,
          );
        }

        return Math.max(
          currentZoom - ZOOM_STEP,
          MIN_ZOOM,
        );
      });
    }

    workspace.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      workspace.removeEventListener(
        "wheel",
        handleWheel,
      );
    };
  }, []);

  function getCanvasPoint(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x:
        (event.clientX - rect.left) *
        (canvas.width / rect.width),
      y:
        (event.clientY - rect.top) *
        (canvas.height / rect.height),
    };
  }

  function configureContext(
    context: CanvasRenderingContext2D,
  ) {
    context.lineCap = "round";
    context.lineJoin = "round";

    if (tool === "brush") {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineWidth = brushSize;
    } else {
      context.globalCompositeOperation = "destination-out";
      context.lineWidth = eraserSize;
    }
  }

  function drawPoint(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
  ) {
    configureContext(context);

    const radius =
      tool === "brush"
        ? brushSize / 2
        : eraserSize / 2;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    if (tool === "eraser") {
      context.fillStyle = "rgba(0, 0, 0, 1)";
      context.fill();
    }
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;
    const point = getCanvasPoint(event);

    if (!canvas || !point) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);

    isDrawingRef.current = true;
    lastPointRef.current = point;

    drawPoint(context, point.x, point.y);
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (!isDrawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const point = getCanvasPoint(event);
    const lastPoint = lastPointRef.current;

    if (!canvas || !point || !lastPoint) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    configureContext(context);

    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();

    lastPointRef.current = point;
  }

  function handlePointerUp(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    isDrawingRef.current = false;
    lastPointRef.current = null;
  }

  function handleSizeChange(value: number) {
    if (tool === "brush") {
      setBrushSize(value);
      return;
    }

    setEraserSize(value);
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#09090d] text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0d0d12] px-4">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff1152] font-black">
              B
            </div>

            <span className="text-xl font-black">box</span>
          </Link>

          <div className="hidden h-7 w-px bg-white/10 md:block" />

          <div className="hidden md:block">
            <p className="text-sm font-bold">
              Sala {roomCode.toUpperCase()}
            </p>

            <p className="text-xs font-medium text-white/30">
              1 de 5 participantes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1.5 pr-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff1152] text-xs font-black">
                {userInitial}
              </div>
            )}

            <span className="hidden text-sm font-bold text-white/70 sm:block">
              {userName}
            </span>
          </div>

          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} />
          </Link>
        </div>
      </header>

      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#101015] px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            title="Pincel"
            onClick={() => setTool("brush")}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              tool === "brush"
                ? "bg-[#ff1152] text-white"
                : "text-white/40 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Brush size={20} />
          </button>

          <button
            type="button"
            title="Borracha"
            onClick={() => setTool("eraser")}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              tool === "eraser"
                ? "bg-[#ff1152] text-white"
                : "text-white/40 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Eraser size={20} />
          </button>

          <div className="mx-2 h-7 w-px bg-white/10" />

          {tool === "brush" && (
            <input
              type="color"
              value={color}
              onChange={(event) =>
                setColor(event.target.value)
              }
              className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent"
            />
          )}

          <span className="text-xs font-bold text-white/40">
            {tool === "brush"
              ? "Pincel"
              : "Borracha"}
          </span>

          <input
            type="range"
            min="1"
            max={tool === "brush" ? 100 : 200}
            value={currentSize}
            onChange={(event) =>
              handleSizeChange(
                Number(event.target.value),
              )
            }
            className="w-36 accent-[#ff1152]"
          />

          <div className="flex h-8 min-w-16 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-bold">
            {currentSize}px
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Minus
            size={15}
            className="text-white/30"
          />

          <span className="min-w-14 text-center text-xs font-bold text-white/50">
            {zoom}%
          </span>

          <Plus
            size={15}
            className="text-white/30"
          />
        </div>
      </div>

      <div
        ref={workspaceRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#19191f]"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div
          className="relative shrink-0 shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
          style={{
            transform: `scale(${zoom / 100})`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={1000}
            height={700}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`block h-[700px] w-[1000px] touch-none bg-white ${
              tool === "brush"
                ? "cursor-crosshair"
                : "cursor-cell"
            }`}
          />
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-white/[0.08] bg-[#0d0d12]/90 px-3 py-2 text-xs font-bold text-white/40">
          Role o mouse para ajustar o zoom
        </div>
      </div>
    </main>
  );
}