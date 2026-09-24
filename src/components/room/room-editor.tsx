"use client";

import {
  Brush,
  Eraser,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  LogOut,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import {
  DragEvent as ReactDragEvent,
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

type Stroke = {
  id: string;
  tool: Tool;
  color: string;
  size: number;
  points: Point[];
};

type Layer = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
};

type CurrentStroke = {
  layerId: string;
  stroke: Stroke;
};

type HistoryEntry = {
  layerId: string;
  strokeId: string;
};

type DragOverLayer = {
  id: string;
  position: "before" | "after";
};

const PAGE_WIDTH = 3508;
const PAGE_HEIGHT = 2480;

const THUMBNAIL_WIDTH = 140;
const THUMBNAIL_HEIGHT = 99;

const MIN_ZOOM = 25;
const MAX_ZOOM = 150;
const ZOOM_STEP = 10;

const MAX_UNDO_STEPS = 50;

const MIN_VISIBLE_PAGE = 160;

const INITIAL_LAYER_ID = "layer-1";

export default function RoomEditor({
  roomCode,
  userName,
  avatarUrl,
}: RoomEditorProps) {
  const workspaceRef =
    useRef<HTMLDivElement>(null);

  const isDrawingRef =
    useRef(false);

  const isPanningRef =
    useRef(false);

  const lastDrawingPointRef =
    useRef<Point | null>(null);

  const lastPanPointRef =
    useRef<Point | null>(null);

  const currentStrokeRef =
    useRef<CurrentStroke | null>(
      null,
    );

  const strokesByLayerRef =
    useRef<Map<string, Stroke[]>>(
      new Map([
        [INITIAL_LAYER_ID, []],
      ]),
    );

  const historyRef =
    useRef<HistoryEntry[]>([]);

  const layerCounterRef =
    useRef(1);

  const draggedLayerIdRef =
    useRef<string | null>(null);

  const pendingThumbnailLayersRef =
    useRef<Set<string>>(
      new Set(),
    );

  const thumbnailAnimationFrameRef =
    useRef<number | null>(null);

  const zoomRef =
    useRef(25);

  const panRef =
    useRef<Point>({
      x: 0,
      y: 0,
    });

  const [mounted, setMounted] =
    useState(false);

  const [layers, setLayers] =
    useState<Layer[]>([
      {
        id: INITIAL_LAYER_ID,
        name: "01",
        visible: true,
        opacity: 100,
      },
    ]);

  const [
    activeLayerId,
    setActiveLayerId,
  ] = useState(
    INITIAL_LAYER_ID,
  );

  const [tool, setTool] =
    useState<Tool>("brush");

  const [
    brushSize,
    setBrushSize,
  ] = useState(12);

  const [
    eraserSize,
    setEraserSize,
  ] = useState(50);

  const [color, setColor] =
    useState("#111111");

  const [zoom, setZoom] =
    useState(25);

  const [pan, setPan] =
    useState<Point>({
      x: 0,
      y: 0,
    });

  const [
    isPanning,
    setIsPanning,
  ] = useState(false);

  const [
    undoAvailable,
    setUndoAvailable,
  ] = useState(0);

  const [
    dragOverLayer,
    setDragOverLayer,
  ] =
    useState<DragOverLayer | null>(
      null,
    );

  const userInitial =
    userName
      .charAt(0)
      .toUpperCase();

  const currentSize =
    tool === "brush"
      ? brushSize
      : eraserSize;

  const activeLayer =
    layers.find(
      (layer) =>
        layer.id ===
        activeLayerId,
    ) ?? null;

  useEffect(() => {
    setMounted(true);

    return () => {
      if (
        thumbnailAnimationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          thumbnailAnimationFrameRef.current,
        );
      }
    };
  }, []);

  function formatLayerName(
    number: number,
  ) {
    return String(
      number,
    ).padStart(2, "0");
  }

  function getLayerCanvas(
    layerId: string,
  ) {
    return (
      workspaceRef.current?.querySelector<HTMLCanvasElement>(
        `canvas[data-layer-id="${layerId}"]`,
      ) ?? null
    );
  }

  function getLayerThumbnailCanvas(
    layerId: string,
  ) {
    return document.querySelector<HTMLCanvasElement>(
      `canvas[data-layer-thumbnail-id="${layerId}"]`,
    );
  }

  function renderLayerThumbnail(
    layerId: string,
  ) {
    const sourceCanvas =
      getLayerCanvas(layerId);

    const thumbnailCanvas =
      getLayerThumbnailCanvas(
        layerId,
      );

    if (
      !sourceCanvas ||
      !thumbnailCanvas
    ) {
      return;
    }

    const context =
      thumbnailCanvas.getContext(
        "2d",
      );

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      thumbnailCanvas.width,
      thumbnailCanvas.height,
    );

    context.drawImage(
      sourceCanvas,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
      0,
      0,
      thumbnailCanvas.width,
      thumbnailCanvas.height,
    );
  }

  function scheduleLayerThumbnailUpdate(
    layerId: string,
  ) {
    pendingThumbnailLayersRef.current.add(
      layerId,
    );

    if (
      thumbnailAnimationFrameRef.current !==
      null
    ) {
      return;
    }

    thumbnailAnimationFrameRef.current =
      requestAnimationFrame(() => {
        const pendingLayers = [
          ...pendingThumbnailLayersRef.current,
        ];

        pendingThumbnailLayersRef.current.clear();

        thumbnailAnimationFrameRef.current =
          null;

        for (
          const pendingLayerId of
          pendingLayers
        ) {
          renderLayerThumbnail(
            pendingLayerId,
          );
        }
      });
  }

  function clampPan(
    nextPan: Point,
    zoomValue: number =
      zoomRef.current,
  ) {
    const workspace =
      workspaceRef.current;

    if (!workspace) {
      return nextPan;
    }

    const rect =
      workspace.getBoundingClientRect();

    const scale =
      zoomValue / 100;

    const scaledPageWidth =
      PAGE_WIDTH * scale;

    const scaledPageHeight =
      PAGE_HEIGHT * scale;

    const maxPanX =
      Math.max(
        0,
        rect.width / 2 +
          scaledPageWidth / 2 -
          MIN_VISIBLE_PAGE,
      );

    const maxPanY =
      Math.max(
        0,
        rect.height / 2 +
          scaledPageHeight / 2 -
          MIN_VISIBLE_PAGE,
      );

    return {
      x: Math.max(
        -maxPanX,
        Math.min(
          nextPan.x,
          maxPanX,
        ),
      ),
      y: Math.max(
        -maxPanY,
        Math.min(
          nextPan.y,
          maxPanY,
        ),
      ),
    };
  }

  useEffect(() => {
    const workspace =
      workspaceRef.current;

    if (!workspace) {
      return;
    }

    function handleWheel(
      event: WheelEvent,
    ) {
      event.preventDefault();

      const workspace =
        workspaceRef.current;

      if (!workspace) {
        return;
      }

      const rect =
        workspace.getBoundingClientRect();

      const mouseX =
        event.clientX -
        (rect.left +
          rect.width / 2);

      const mouseY =
        event.clientY -
        (rect.top +
          rect.height / 2);

      const currentZoom =
        zoomRef.current;

      const nextZoom =
        event.deltaY < 0
          ? Math.min(
              currentZoom +
                ZOOM_STEP,
              MAX_ZOOM,
            )
          : Math.max(
              currentZoom -
                ZOOM_STEP,
              MIN_ZOOM,
            );

      if (
        nextZoom ===
        currentZoom
      ) {
        return;
      }

      const currentScale =
        currentZoom / 100;

      const nextScale =
        nextZoom / 100;

      const currentPan =
        panRef.current;

      const pointX =
        (mouseX -
          currentPan.x) /
        currentScale;

      const pointY =
        (mouseY -
          currentPan.y) /
        currentScale;

      const nextPan =
        clampPan(
          {
            x:
              mouseX -
              pointX *
                nextScale,
            y:
              mouseY -
              pointY *
                nextScale,
          },
          nextZoom,
        );

      zoomRef.current =
        nextZoom;

      panRef.current =
        nextPan;

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

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      const isUndoShortcut =
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          "z";

      if (!isUndoShortcut) {
        return;
      }

      event.preventDefault();

      handleUndo();
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  function getCanvasPoint(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    const canvas =
      event.currentTarget;

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        (event.clientX -
          rect.left) *
        (canvas.width /
          rect.width),

      y:
        (event.clientY -
          rect.top) *
        (canvas.height /
          rect.height),
    };
  }

  function configureContext(
    context: CanvasRenderingContext2D,
    stroke: Stroke,
  ) {
    context.lineCap =
      "round";

    context.lineJoin =
      "round";

    context.lineWidth =
      stroke.size;

    if (
      stroke.tool ===
      "brush"
    ) {
      context.globalCompositeOperation =
        "source-over";

      context.strokeStyle =
        stroke.color;

      context.fillStyle =
        stroke.color;

      return;
    }

    context.globalCompositeOperation =
      "destination-out";

    context.strokeStyle =
      "#000000";

    context.fillStyle =
      "#000000";
  }

  function drawStrokePoint(
    context: CanvasRenderingContext2D,
    stroke: Stroke,
    point: Point,
  ) {
    configureContext(
      context,
      stroke,
    );

    context.beginPath();

    context.arc(
      point.x,
      point.y,
      stroke.size / 2,
      0,
      Math.PI * 2,
    );

    context.fill();
  }

  function drawStrokeSegment(
    context: CanvasRenderingContext2D,
    stroke: Stroke,
    from: Point,
    to: Point,
  ) {
    configureContext(
      context,
      stroke,
    );

    context.beginPath();

    context.moveTo(
      from.x,
      from.y,
    );

    context.lineTo(
      to.x,
      to.y,
    );

    context.stroke();
  }

  function renderLayer(
    layerId: string,
  ) {
    const canvas =
      getLayerCanvas(
        layerId,
      );

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.globalCompositeOperation =
      "source-over";

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const strokes =
      strokesByLayerRef.current.get(
        layerId,
      ) ?? [];

    for (
      const stroke of
      strokes
    ) {
      const firstPoint =
        stroke.points[0];

      if (!firstPoint) {
        continue;
      }

      drawStrokePoint(
        context,
        stroke,
        firstPoint,
      );

      for (
        let index = 1;
        index <
        stroke.points.length;
        index++
      ) {
        const previousPoint =
          stroke.points[
            index - 1
          ];

        const currentPoint =
          stroke.points[
            index
          ];

        drawStrokeSegment(
          context,
          stroke,
          previousPoint,
          currentPoint,
        );
      }
    }

    context.globalCompositeOperation =
      "source-over";

    renderLayerThumbnail(
      layerId,
    );
  }

  function handleUndo() {
    const historyEntry =
      historyRef.current.pop();

    if (!historyEntry) {
      return;
    }

    const strokes =
      strokesByLayerRef.current.get(
        historyEntry.layerId,
      );

    if (!strokes) {
      setUndoAvailable(
        historyRef.current
          .length,
      );

      return;
    }

    const strokeIndex =
      strokes.findIndex(
        (stroke) =>
          stroke.id ===
          historyEntry.strokeId,
      );

    if (
      strokeIndex >= 0
    ) {
      strokes.splice(
        strokeIndex,
        1,
      );
    }

    renderLayer(
      historyEntry.layerId,
    );

    setUndoAvailable(
      historyRef.current
        .length,
    );
  }

  function handleCanvasPointerDown(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (
      event.button !== 0
    ) {
      return;
    }

    if (
      !activeLayer ||
      !activeLayer.visible
    ) {
      return;
    }

    const canvas =
      event.currentTarget;

    const point =
      getCanvasPoint(
        event,
      );

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    const stroke: Stroke = {
      id: crypto.randomUUID(),
      tool,
      color,
      size:
        tool === "brush"
          ? brushSize
          : eraserSize,
      points: [point],
    };

    canvas.setPointerCapture(
      event.pointerId,
    );

    isDrawingRef.current =
      true;

    lastDrawingPointRef.current =
      point;

    currentStrokeRef.current =
      {
        layerId:
          activeLayerId,
        stroke,
      };

    drawStrokePoint(
      context,
      stroke,
      point,
    );

    scheduleLayerThumbnailUpdate(
      activeLayerId,
    );
  }

  function handleCanvasPointerMove(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (
      !isDrawingRef.current
    ) {
      return;
    }

    const currentStroke =
      currentStrokeRef.current;

    const previousPoint =
      lastDrawingPointRef.current;

    if (
      !currentStroke ||
      !previousPoint
    ) {
      return;
    }

    const currentPoint =
      getCanvasPoint(
        event,
      );

    const context =
      event.currentTarget.getContext(
        "2d",
      );

    if (!context) {
      return;
    }

    currentStroke.stroke.points.push(
      currentPoint,
    );

    drawStrokeSegment(
      context,
      currentStroke.stroke,
      previousPoint,
      currentPoint,
    );

    lastDrawingPointRef.current =
      currentPoint;

    scheduleLayerThumbnailUpdate(
      currentStroke.layerId,
    );
  }

  function handleCanvasPointerUp(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    const canvas =
      event.currentTarget;

    if (
      canvas.hasPointerCapture(
        event.pointerId,
      )
    ) {
      canvas.releasePointerCapture(
        event.pointerId,
      );
    }

    const currentStroke =
      currentStrokeRef.current;

    if (
      isDrawingRef.current &&
      currentStroke
    ) {
      const strokes =
        strokesByLayerRef.current.get(
          currentStroke.layerId,
        ) ?? [];

      strokes.push(
        currentStroke.stroke,
      );

      strokesByLayerRef.current.set(
        currentStroke.layerId,
        strokes,
      );

      historyRef.current.push(
        {
          layerId:
            currentStroke.layerId,
          strokeId:
            currentStroke.stroke.id,
        },
      );

      if (
        historyRef.current
          .length >
        MAX_UNDO_STEPS
      ) {
        historyRef.current.shift();
      }

      setUndoAvailable(
        historyRef.current
          .length,
      );

      renderLayerThumbnail(
        currentStroke.layerId,
      );
    }

    isDrawingRef.current =
      false;

    lastDrawingPointRef.current =
      null;

    currentStrokeRef.current =
      null;
  }

  function handleWorkspacePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      event.button !== 1
    ) {
      return;
    }

    event.preventDefault();

    isPanningRef.current =
      true;

    setIsPanning(
      true,
    );

    lastPanPointRef.current =
      {
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
    if (
      !isPanningRef.current
    ) {
      return;
    }

    const lastPoint =
      lastPanPointRef.current;

    if (!lastPoint) {
      return;
    }

    const deltaX =
      event.clientX -
      lastPoint.x;

    const deltaY =
      event.clientY -
      lastPoint.y;

    const nextPan =
      clampPan({
        x:
          panRef.current.x +
          deltaX,

        y:
          panRef.current.y +
          deltaY,
      });

    panRef.current =
      nextPan;

    setPan(nextPan);

    lastPanPointRef.current =
      {
        x: event.clientX,
        y: event.clientY,
      };
  }

  function handleWorkspacePointerUp(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
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

    isPanningRef.current =
      false;

    lastPanPointRef.current =
      null;

    setIsPanning(
      false,
    );
  }

  function handleSizeChange(
    value: number,
  ) {
    if (
      tool === "brush"
    ) {
      setBrushSize(
        value,
      );

      return;
    }

    setEraserSize(
      value,
    );
  }

  function addLayer() {
    layerCounterRef.current +=
      1;

    const layerId =
      crypto.randomUUID();

    const newLayer: Layer =
      {
        id: layerId,
        name: formatLayerName(
          layerCounterRef.current,
        ),
        visible: true,
        opacity: 100,
      };

    strokesByLayerRef.current.set(
      layerId,
      [],
    );

    setLayers(
      (
        currentLayers,
      ) => [
        ...currentLayers,
        newLayer,
      ],
    );

    setActiveLayerId(
      layerId,
    );
  }

  function toggleLayerVisibility(
    layerId: string,
  ) {
    setLayers(
      (
        currentLayers,
      ) =>
        currentLayers.map(
          (layer) =>
            layer.id ===
            layerId
              ? {
                  ...layer,
                  visible:
                    !layer.visible,
                }
              : layer,
        ),
    );
  }

  function changeLayerOpacity(
    layerId: string,
    opacity: number,
  ) {
    const safeOpacity =
      Math.max(
        0,
        Math.min(
          100,
          opacity,
        ),
      );

    setLayers(
      (
        currentLayers,
      ) =>
        currentLayers.map(
          (layer) =>
            layer.id ===
            layerId
              ? {
                  ...layer,
                  opacity:
                    safeOpacity,
                }
              : layer,
        ),
    );
  }

  function deleteLayer(
    layerId: string,
  ) {
    if (
      layers.length <= 1
    ) {
      return;
    }

    const remainingLayers =
      layers.filter(
        (layer) =>
          layer.id !==
          layerId,
      );

    strokesByLayerRef.current.delete(
      layerId,
    );

    historyRef.current =
      historyRef.current.filter(
        (entry) =>
          entry.layerId !==
          layerId,
      );

    pendingThumbnailLayersRef.current.delete(
      layerId,
    );

    setUndoAvailable(
      historyRef.current
        .length,
    );

    setLayers(
      remainingLayers,
    );

    if (
      activeLayerId ===
      layerId
    ) {
      setActiveLayerId(
        remainingLayers[
          remainingLayers.length -
            1
        ].id,
      );
    }
  }

  function handleLayerDragStart(
    event: ReactDragEvent,
    layerId: string,
  ) {
    draggedLayerIdRef.current =
      layerId;

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      layerId,
    );
  }

  function handleLayerDragOver(
    event: ReactDragEvent,
    layerId: string,
  ) {
    event.preventDefault();

    const draggedLayerId =
      draggedLayerIdRef.current;

    if (
      !draggedLayerId ||
      draggedLayerId ===
        layerId
    ) {
      setDragOverLayer(
        null,
      );

      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const middle =
      rect.top +
      rect.height / 2;

    const position =
      event.clientY <
      middle
        ? "before"
        : "after";

    setDragOverLayer({
      id: layerId,
      position,
    });

    event.dataTransfer.dropEffect =
      "move";
  }

  function handleLayerDrop(
    event: ReactDragEvent,
    targetLayerId: string,
  ) {
    event.preventDefault();

    const draggedLayerId =
      draggedLayerIdRef.current;

    if (
      !draggedLayerId ||
      draggedLayerId ===
        targetLayerId
    ) {
      draggedLayerIdRef.current =
        null;

      setDragOverLayer(
        null,
      );

      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const middle =
      rect.top +
      rect.height / 2;

    const position =
      event.clientY <
      middle
        ? "before"
        : "after";

    setLayers(
      (
        currentLayers,
      ) => {
        const displayedLayers =
          [
            ...currentLayers,
          ].reverse();

        const draggedIndex =
          displayedLayers.findIndex(
            (layer) =>
              layer.id ===
              draggedLayerId,
          );

        if (
          draggedIndex ===
          -1
        ) {
          return currentLayers;
        }

        const [
          draggedLayer,
        ] =
          displayedLayers.splice(
            draggedIndex,
            1,
          );

        const targetIndex =
          displayedLayers.findIndex(
            (layer) =>
              layer.id ===
              targetLayerId,
          );

        if (
          targetIndex ===
          -1
        ) {
          return currentLayers;
        }

        const insertIndex =
          position ===
          "after"
            ? targetIndex +
              1
            : targetIndex;

        displayedLayers.splice(
          insertIndex,
          0,
          draggedLayer,
        );

        return displayedLayers.reverse();
      },
    );

    draggedLayerIdRef.current =
      null;

    setDragOverLayer(
      null,
    );
  }

  function handleLayerDragEnd() {
    draggedLayerIdRef.current =
      null;

    setDragOverLayer(
      null,
    );
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
          <div className="hidden rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/35 lg:block">
            A4 horizontal • 3508 ×
            2480 • 300 DPI
          </div>

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
            title="Sair da sala"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut
              size={18}
            />
          </Link>
        </div>
      </header>

      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#101015] px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            title="Pincel"
            onClick={() =>
              setTool(
                "brush",
              )
            }
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              tool === "brush"
                ? "bg-[#ff1152] text-white"
                : "text-white/40 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Brush
              size={20}
            />
          </button>

          <button
            type="button"
            title="Borracha"
            onClick={() =>
              setTool(
                "eraser",
              )
            }
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              tool === "eraser"
                ? "bg-[#ff1152] text-white"
                : "text-white/40 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Eraser
              size={20}
            />
          </button>

          <button
            type="button"
            title="Desfazer (Ctrl+Z)"
            onClick={
              handleUndo
            }
            disabled={
              mounted
                ? undoAvailable ===
                  0
                : false
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent"
          >
            <Undo2
              size={20}
            />
          </button>

          <div className="mx-2 h-7 w-px bg-white/10" />

          {tool ===
            "brush" && (
            <input
              type="color"
              value={
                color
              }
              onChange={(
                event,
              ) =>
                setColor(
                  event
                    .target
                    .value,
                )
              }
              className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent"
            />
          )}

          <span className="text-xs font-bold text-white/40">
            {tool ===
            "brush"
              ? "Pincel"
              : "Borracha"}
          </span>

          <input
            type="range"
            min="1"
            max={
              tool ===
              "brush"
                ? 100
                : 200
            }
            value={
              currentSize
            }
            onChange={(
              event,
            ) =>
              handleSizeChange(
                Number(
                  event
                    .target
                    .value,
                ),
              )
            }
            className="w-36 accent-[#ff1152]"
          />

          <div className="flex h-8 min-w-16 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-bold">
            {currentSize}px
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-white/25">
            Undo{" "}
            {undoAvailable}/
            {
              MAX_UNDO_STEPS
            }
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/50">
            {zoom}%
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          ref={
            workspaceRef
          }
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
          onAuxClick={(
            event,
          ) => {
            if (
              event.button ===
              1
            ) {
              event.preventDefault();
            }
          }}
          className={`relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-[#19191f] ${
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
              backgroundSize:
                "24px 24px",
            }}
          />

          <div
            className="relative shrink-0 bg-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
            style={{
              width:
                PAGE_WIDTH,
              height:
                PAGE_HEIGHT,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
              transformOrigin:
                "center center",
            }}
          >
            {layers.map(
              (
                layer,
              ) => (
                <canvas
                  key={
                    layer.id
                  }
                  data-layer-id={
                    layer.id
                  }
                  width={
                    PAGE_WIDTH
                  }
                  height={
                    PAGE_HEIGHT
                  }
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
                  className={`absolute inset-0 block touch-none ${
                    layer.visible
                      ? ""
                      : "invisible"
                  } ${
                    layer.id ===
                    activeLayerId
                      ? tool ===
                        "brush"
                        ? "cursor-crosshair"
                        : "cursor-cell"
                      : "pointer-events-none"
                  }`}
                  style={{
                    width:
                      PAGE_WIDTH,
                    height:
                      PAGE_HEIGHT,
                    opacity:
                      layer.opacity /
                      100,
                  }}
                />
              ),
            )}
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0d0d12]/90 px-4 py-2 text-xs font-bold text-white/40 backdrop-blur">
            <span>
              Scroll: zoom
            </span>

            <span className="text-white/15">
              •
            </span>

            <span>
              Botão do meio:
              mover
            </span>

            <span className="text-white/15">
              •
            </span>

            <span>
              Ctrl+Z:
              desfazer
            </span>
          </div>
        </div>

        <aside className="flex w-72 shrink-0 flex-col border-l border-white/[0.07] bg-[#0d0d12]">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] px-4">
            <div className="flex items-center gap-2">
              <Layers
                size={17}
                className="text-[#ff1152]"
              />

              <span className="text-sm font-black">
                Camadas
              </span>
            </div>

            <button
              type="button"
              title="Adicionar camada"
              onClick={
                addLayer
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-[#ff1152]/10 hover:text-[#ff1152]"
            >
              <Plus
                size={18}
              />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            {[...layers]
              .reverse()
              .map(
                (
                  layer,
                ) => {
                  const isActive =
                    layer.id ===
                    activeLayerId;

                  const isDragOver =
                    dragOverLayer?.id ===
                    layer.id;

                  return (
                    <div
                      key={
                        layer.id
                      }
                      onClick={() =>
                        setActiveLayerId(
                          layer.id,
                        )
                      }
                      onDragOver={(
                        event,
                      ) =>
                        handleLayerDragOver(
                          event,
                          layer.id,
                        )
                      }
                      onDrop={(
                        event,
                      ) =>
                        handleLayerDrop(
                          event,
                          layer.id,
                        )
                      }
                      className={`group relative rounded-xl border p-2 transition ${
                        isActive
                          ? "border-[#ff1152]/40 bg-[#ff1152]/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                      } ${
                        isDragOver &&
                        dragOverLayer?.position ===
                          "before"
                          ? "before:absolute before:left-0 before:right-0 before:top-[-5px] before:h-[2px] before:rounded-full before:bg-[#ff1152]"
                          : ""
                      } ${
                        isDragOver &&
                        dragOverLayer?.position ===
                          "after"
                          ? "after:absolute after:bottom-[-5px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-[#ff1152]"
                          : ""
                      }`}
                    >
                      <div className="flex cursor-pointer items-center gap-2">
                        <div
                          draggable
                          title="Arrastar para reordenar"
                          onDragStart={(
                            event,
                          ) =>
                            handleLayerDragStart(
                              event,
                              layer.id,
                            )
                          }
                          onDragEnd={
                            handleLayerDragEnd
                          }
                          onClick={(
                            event,
                          ) =>
                            event.stopPropagation()
                          }
                          className="flex h-9 w-5 shrink-0 cursor-grab items-center justify-center text-white/20 transition hover:text-white/60 active:cursor-grabbing"
                        >
                          <GripVertical
                            size={
                              16
                            }
                          />
                        </div>

                        <button
                          type="button"
                          title={
                            layer.visible
                              ? "Ocultar camada"
                              : "Mostrar camada"
                          }
                          onClick={(
                            event,
                          ) => {
                            event.stopPropagation();

                            toggleLayerVisibility(
                              layer.id,
                            );
                          }}
                          className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          {layer.visible ? (
                            <Eye
                              size={
                                16
                              }
                            />
                          ) : (
                            <EyeOff
                              size={
                                16
                              }
                            />
                          )}
                        </button>

                        <div className="relative h-12 w-[68px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white shadow-sm">
                          <canvas
                            data-layer-thumbnail-id={
                              layer.id
                            }
                            width={
                              THUMBNAIL_WIDTH
                            }
                            height={
                              THUMBNAIL_HEIGHT
                            }
                            className="h-full w-full"
                            style={{
                              opacity:
                                layer.opacity /
                                100,
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-black ${
                              isActive
                                ? "text-white"
                                : "text-white/60"
                            }`}
                          >
                            {
                              layer.name
                            }
                          </p>

                          <p className="mt-0.5 text-[10px] font-medium text-white/20">
                            {layer.visible
                              ? "Visível"
                              : "Oculta"}
                          </p>
                        </div>

                        <button
                          type="button"
                          title="Excluir camada"
                          disabled={
                            mounted
                              ? layers.length ===
                                1
                              : false
                          }
                          onClick={(
                            event,
                          ) => {
                            event.stopPropagation();

                            deleteLayer(
                              layer.id,
                            );
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/20 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white/20 group-hover:opacity-100"
                        >
                          <Trash2
                            size={
                              15
                            }
                          />
                        </button>
                      </div>

                      <div
                        className="mt-2 flex items-center gap-2 pl-7"
                        onClick={(
                          event,
                        ) =>
                          event.stopPropagation()
                        }
                      >
                        <span className="w-14 shrink-0 text-[10px] font-bold text-white/30">
                          Opacidade
                        </span>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={
                            layer.opacity
                          }
                          onChange={(
                            event,
                          ) =>
                            changeLayerOpacity(
                              layer.id,
                              Number(
                                event
                                  .target
                                  .value,
                              ),
                            )
                          }
                          className="min-w-0 flex-1 accent-[#ff1152]"
                        />

                        <span className="w-9 shrink-0 text-right text-[10px] font-bold text-white/40">
                          {
                            layer.opacity
                          }
                          %
                        </span>
                      </div>
                    </div>
                  );
                },
              )}
          </div>

          <div className="border-t border-white/[0.07] px-4 py-3">
            <p className="text-[11px] font-medium text-white/25">
              {layers.length}{" "}
              {layers.length ===
              1
                ? "camada"
                : "camadas"}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}