"use client";

import {
  Brush,
  Eraser,
  LogOut,
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

type Point = {
  x: number;
  y: number;
};

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
  const isPanningRef = useRef(false);

  const lastDrawingPointRef = useRef<Point | null>(null);
  const lastPanPointRef = useRef<Point | null>(null);

  const zoomRef = useRef(100);
  const panRef = useRef<Point>({
    x: 0,
    y: 0,
  });

  const [tool, setTool] = useState<Tool>("brush");

  const [brushSize, setBrushSize] = useState(8);
  const [eraserSize, setEraserSize] = useState(30);

  const [color, setColor] = useState("#111111");

  const [zoom, setZoom] = useState(100);

  const [pan, setPan] = useState<Point>({
    x: 0,
    y: 0,
  });

  const [isPanning, setIsPanning] = useState(false);

  const userInitial = userName
    .charAt(0)
    .toUpperCase();

  const currentSize =
    tool === "brush"
      ? brushSize
      : eraserSize;

  useEffect(() => {
    const workspace = workspaceRef.current;

    if (!workspace) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();

      const workspace = workspaceRef.current;

      if (!workspace) {
        return;
      }

      const rect =
        workspace.getBoundingClientRect();

      const mouseX =
        event.clientX -
        (rect.left + rect.width / 2);

      const mouseY =
        event.clientY -
        (rect.top + rect.height / 2);

      const currentZoom = zoomRef.current;

      const nextZoom =
        event.deltaY < 0
          ? Math.min(
              currentZoom + ZOOM_STEP,
              MAX_ZOOM,
            )
          : Math.max(
              currentZoom - ZOOM_STEP,
              MIN_ZOOM,
            );

      if (nextZoom === currentZoom) {
        return;
      }

      const currentScale =
        currentZoom / 100;

      const nextScale =
        nextZoom / 100;

      const currentPan =
        panRef.current;

      const pointX =
        (mouseX - currentPan.x) /
        currentScale;

      const pointY =
        (mouseY - currentPan.y) /
        currentScale;

      const nextPan = {
        x:
          mouseX -
          pointX * nextScale,
        y:
          mouseY -
          pointY * nextScale,
      };

      zoomRef.current = nextZoom;
      panRef.current = nextPan;

      setZoom(nextZoom);
      setPan(nextPan);
    }

    workspace.addEventListener(
      "wheel",
      handleWheel,
      {
        passive: false,
      },
    );

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

    const rect =
      canvas.getBoundingClientRect();

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
      context.globalCompositeOperation =
        "source-over";

      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineWidth = brushSize;

      return;
    }

    context.globalCompositeOperation =
      "destination-out";

    context.strokeStyle = "#000000";
    context.fillStyle = "#000000";
    context.lineWidth = eraserSize;
  }

  function drawPoint(
    context: CanvasRenderingContext2D,
    point: Point,
  ) {
    configureContext(context);

    const size =
      tool === "brush"
        ? brushSize
        : eraserSize;

    context.beginPath();

    context.arc(
      point.x,
      point.y,
      size / 2,
      0,
      Math.PI * 2,
    );

    context.fill();
  }

  function handleCanvasPointerDown(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (event.button !== 0) {
      return;
    }

    const canvas = canvasRef.current;
    const point = getCanvasPoint(event);

    if (!canvas || !point) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvas.setPointerCapture(
      event.pointerId,
    );

    isDrawingRef.current = true;

    lastDrawingPointRef.current =
      point;

    drawPoint(context, point);
  }

  function handleCanvasPointerMove(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (!isDrawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;

    const currentPoint =
      getCanvasPoint(event);

    const lastPoint =
      lastDrawingPointRef.current;

    if (
      !canvas ||
      !currentPoint ||
      !lastPoint
    ) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    configureContext(context);

    context.beginPath();

    context.moveTo(
      lastPoint.x,
      lastPoint.y,
    );

    context.lineTo(
      currentPoint.x,
      currentPoint.y,
    );

    context.stroke();

    lastDrawingPointRef.current =
      currentPoint;
  }

  function handleCanvasPointerUp(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;

    if (
      canvas?.hasPointerCapture(
        event.pointerId,
      )
    ) {
      canvas.releasePointerCapture(
        event.pointerId,
      );
    }

    isDrawingRef.current = false;
    lastDrawingPointRef.current = null;
  }

  function handleWorkspacePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (event.button !== 1) {
      return;
    }

    event.preventDefault();

    isPanningRef.current = true;
    setIsPanning(true);

    lastPanPointRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  }

  function handleWorkspacePointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (!isPanningRef.current) {
      return;
    }

    const lastPoint =
      lastPanPointRef.current;

    if (!lastPoint) {
      return;
    }

    const deltaX =
      event.clientX - lastPoint.x;

    const deltaY =
      event.clientY - lastPoint.y;

    const nextPan = {
      x: panRef.current.x + deltaX,
      y: panRef.current.y + deltaY,
    };

    panRef.current = nextPan;

    setPan(nextPan);

    lastPanPointRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handleWorkspacePointerUp(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      event.button !== 1 &&
      !isPanningRef.current
    ) {
      return;
    }

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    isPanningRef.current = false;
    lastPanPointRef.current = null;

    setIsPanning(false);
  }

  function handleSizeChange(
    value: number,
  ) {
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
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff1152] font-black">
              B
            </div>

            <span className="text-xl font-black">
              box
            </span>
          </Link>

          <div className="hidden h-7 w-px bg-white/10 md:block" />

          <div className="hidden md:block">
            <p className="text-sm font-bold">
              Sala{" "}
              {roomCode.toUpperCase()}
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
            onClick={() =>
              setTool("brush")
            }
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
            onClick={() =>
              setTool("eraser")
            }
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
                setColor(
                  event.target.value,
                )
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
            max={
              tool === "brush"
                ? 100
                : 200
            }
            value={currentSize}
            onChange={(event) =>
              handleSizeChange(
                Number(
                  event.target.value,
                ),
              )
            }
            className="w-36 accent-[#ff1152]"
          />

          <div className="flex h-8 min-w-16 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-bold">
            {currentSize}px
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/50">
          {zoom}%
        </div>
      </div>

      <div
        ref={workspaceRef}
        onPointerDown={
          handleWorkspacePointerDown
        }
        onPointerMove={
          handleWorkspacePointerMove
        }
        onPointerUp={
          handleWorkspacePointerUp
        }
        onPointerCancel={
          handleWorkspacePointerUp
        }
        onAuxClick={(event) => {
          if (event.button === 1) {
            event.preventDefault();
          }
        }}
        className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#19191f] ${
          isPanning
            ? "cursor-grabbing"
            : ""
        }`}
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
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
            transformOrigin:
              "center center",
          }}
        >
          <canvas
            ref={canvasRef}
            width={1000}
            height={700}
            onPointerDown={
              handleCanvasPointerDown
            }
            onPointerMove={
              handleCanvasPointerMove
            }
            onPointerUp={
              handleCanvasPointerUp
            }
            onPointerCancel={
              handleCanvasPointerUp
            }
            className={`block h-[700px] w-[1000px] touch-none bg-white ${
              tool === "brush"
                ? "cursor-crosshair"
                : "cursor-cell"
            }`}
          />
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0d0d12]/90 px-4 py-2 text-xs font-bold text-white/40 backdrop-blur">
          <span>
            Scroll: zoom
          </span>

          <span className="text-white/15">
            •
          </span>

          <span>
            Botão do meio: mover
          </span>
        </div>
      </div>
    </main>
  );
}