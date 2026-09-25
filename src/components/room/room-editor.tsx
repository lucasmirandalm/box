"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Brush,
  ChevronDown,
  ChevronUp,
  Download,
  Eraser,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  LogOut,
  Plus,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type RoomEditorProps = {
  roomCode: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
};

type Tool = "brush" | "eraser";

type Point = {
  x: number;
  y: number;
  pressure?: number;
};

type TouchGestureState = {
  startDistance: number;
  startZoom: number;
  anchorX: number;
  anchorY: number;
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

type StrokeHistoryEntry = {
  type: "stroke";
  layerId: string;
  strokeId: string;
};

type LayerDeleteHistoryEntry = {
  type: "layer-delete";
  layerId: string;
  layer: Layer;
  strokes: Stroke[];
  index: number;
  wasActive: boolean;
};

type HistoryEntry = StrokeHistoryEntry | LayerDeleteHistoryEntry;

type DragOverLayer = {
  id: string;
  position: "before" | "after";
};

type Participant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  onlineAt: string;
};

type PresencePayload = {
  userId?: string;
  name?: string;
  avatarUrl?: string | null;
  onlineAt?: string;
  presence_ref?: string;
};

type CursorState = {
  userId: string;
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
  tool: Tool;
};

type CursorMovePayload = CursorState;

type CursorLeavePayload = {
  userId: string;
};

type StrokeStartPayload = {
  userId: string;
  layerId: string;
  stroke: Stroke;
};

type StrokePointsPayload = {
  userId: string;
  layerId: string;
  strokeId: string;
  points: Point[];
};

type StrokeEndPayload = {
  userId: string;
  layerId: string;
  strokeId: string;
};

type StrokeRemovePayload = {
  userId: string;
  layerId: string;
  strokeId: string;
};

type LayerAddPayload = {
  userId: string;
  layer: Layer;
};

type LayerDeletePayload = {
  userId: string;
  layerId: string;
};

type LayerRestorePayload = {
  userId: string;
  layer: Layer;
  strokes: Stroke[];
  layerIds: string[];
};

type LayerUpdatePayload = {
  userId: string;
  layerId: string;
  visible?: boolean;
  opacity?: number;
};

type LayerOrderPayload = {
  userId: string;
  layerIds: string[];
};

type StateRequestPayload = {
  userId: string;
};

type SerializedLayerStrokes = {
  layerId: string;
  strokes: Stroke[];
};

type StateSnapshotPayload = {
  userId: string;
  targetUserId: string;
  layers: Layer[];
  strokes: SerializedLayerStrokes[];
};

type PendingStrokePoints = {
  layerId: string;
  strokeId: string;
  points: Point[];
};

const PAGE_WIDTH = 3508;
const PAGE_HEIGHT = 2480;

const PREVIEW_SCALE = 0.5;
const PREVIEW_WIDTH = Math.round(PAGE_WIDTH * PREVIEW_SCALE);
const PREVIEW_HEIGHT = Math.round(PAGE_HEIGHT * PREVIEW_SCALE);

const THUMBNAIL_WIDTH = 140;
const THUMBNAIL_HEIGHT = 99;

const MIN_ZOOM = 10;
const MAX_ZOOM = 150;
const ZOOM_STEP = 10;

const MAX_UNDO_STEPS = 50;
const MAX_PARTICIPANTS = 5;
const MIN_VISIBLE_PAGE = 160;

const STROKE_BROADCAST_INTERVAL_MS = 50;
const CURSOR_BROADCAST_INTERVAL_MS = 100;
const MIN_POINT_DISTANCE = 1.5;
const MAX_POINTS_PER_PACKET = 48;
const MIN_PRESSURE_SCALE = 0.18;

const INITIAL_LAYER_ID = "layer-1";

const INITIAL_LAYERS: Layer[] = [
  {
    id: INITIAL_LAYER_ID,
    name: "01",
    visible: true,
    opacity: 100,
  },
];

export default function RoomEditor({
  roomCode,
  userId,
  userName,
  avatarUrl,
}: RoomEditorProps) {
  const workspaceRef = useRef<HTMLDivElement>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const realtimeConnectedRef = useRef(false);
  const roomSessionIdRef = useRef<string | null>(null);

  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);

  const lastDrawingPointRef = useRef<Point | null>(null);
  const lastPanPointRef = useRef<Point | null>(null);

  const activeTouchPointersRef = useRef<Map<number, Point>>(new Map());
  const touchGestureRef = useRef<TouchGestureState | null>(null);
  const touchGestureActiveRef = useRef(false);
  const blockTouchDrawingRef = useRef(false);
  const activePenPointerIdRef = useRef<number | null>(null);
  const hasInitializedViewportRef = useRef(false);

  const currentStrokeRef = useRef<CurrentStroke | null>(null);

  const remoteActiveStrokesRef = useRef<Map<string, CurrentStroke>>(
    new Map(),
  );

  const strokesByLayerRef = useRef<Map<string, Stroke[]>>(
    new Map([[INITIAL_LAYER_ID, []]]),
  );

  const historyRef = useRef<HistoryEntry[]>([]);

  const layersRef = useRef<Layer[]>(INITIAL_LAYERS);
  const activeLayerIdRef = useRef(INITIAL_LAYER_ID);
  const layerCounterRef = useRef(1);

  const draggedLayerIdRef = useRef<string | null>(null);

  const pendingStrokePointsRef =
    useRef<PendingStrokePoints | null>(null);

  const strokeBroadcastTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingCursorBroadcastRef =
    useRef<CursorMovePayload | null>(null);

  const cursorBroadcastTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastCursorBroadcastAtRef = useRef(0);

  const participantNamesRef = useRef<Map<string, string>>(
    new Map([[userId, userName]]),
  );

  const localCursorElementRef = useRef<HTMLDivElement | null>(null);
  const localCursorLabelRef = useRef<HTMLDivElement | null>(null);
  const localCursorVisibleRef = useRef(false);

  const localCursorDataRef = useRef<CursorState>({
    userId,
    name: userName,
    x: 0,
    y: 0,
    size: 12,
    color: "#111111",
    tool: "brush",
  });

  const remoteCursorElementsRef = useRef<Map<string, HTMLDivElement>>(
    new Map(),
  );

  const remoteCursorLabelsRef = useRef<Map<string, HTMLDivElement>>(
    new Map(),
  );

  const remoteCursorDataRef = useRef<Map<string, CursorState>>(
    new Map(),
  );

  const hasReceivedSnapshotRef = useRef(false);

  const zoomRef = useRef(25);

  const panRef = useRef<Point>({
    x: 0,
    y: 0,
  });

  const [mounted, setMounted] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([
    {
      userId,
      name: userName,
      avatarUrl,
      onlineAt: "",
    },
  ]);

  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const [layers, setLayers] = useState<Layer[]>(INITIAL_LAYERS);
  const [activeLayerId, setActiveLayerId] = useState(INITIAL_LAYER_ID);

  const [tool, setTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(12);
  const [eraserSize, setEraserSize] = useState(50);
  const [color, setColor] = useState("#111111");

  const [zoom, setZoom] = useState(25);

  const [pan, setPan] = useState<Point>({
    x: 0,
    y: 0,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(0);

  const [dragOverLayer, setDragOverLayer] =
    useState<DragOverLayer | null>(null);

  const [mobileLayersOpen, setMobileLayersOpen] = useState(false);
  const [touchInterface, setTouchInterface] = useState(false);

  const userInitial = userName.charAt(0).toUpperCase();
  const currentSize = tool === "brush" ? brushSize : eraserSize;

  const activeLayer =
    layers.find((layer) => layer.id === activeLayerId) ?? null;

  const participantCount = participants.length;

  useEffect(() => {
    setMounted(true);

    return () => {
      if (strokeBroadcastTimerRef.current !== null) {
        clearTimeout(strokeBroadcastTimerRef.current);
      }

      if (cursorBroadcastTimerRef.current !== null) {
        clearTimeout(cursorBroadcastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const workspace = workspaceRef.current;

    if (!workspace) {
      return;
    }

    function updateViewportForSize() {
      const currentWorkspace = workspaceRef.current;

      if (!currentWorkspace) {
        return;
      }

      const rect = currentWorkspace.getBoundingClientRect();

      if (!hasInitializedViewportRef.current) {
        const horizontalPadding = rect.width < 768 ? 20 : 48;
        const verticalPadding = rect.height < 600 ? 20 : 48;

        const fitZoom = Math.min(
          ((rect.width - horizontalPadding) / PAGE_WIDTH) * 100,
          ((rect.height - verticalPadding) / PAGE_HEIGHT) * 100,
        );

        const nextZoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, fitZoom),
        );

        zoomRef.current = nextZoom;
        panRef.current = { x: 0, y: 0 };
        hasInitializedViewportRef.current = true;

        setZoom(nextZoom);
        setPan({ x: 0, y: 0 });
        return;
      }

      const nextPan = clampPan(panRef.current, zoomRef.current);
      panRef.current = nextPan;
      setPan(nextPan);
    }

    const frame = requestAnimationFrame(updateViewportForSize);
    const observer = new ResizeObserver(updateViewportForSize);

    observer.observe(workspace);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");

    function updateTouchInterface() {
      setTouchInterface(
        mediaQuery.matches || navigator.maxTouchPoints > 1,
      );
    }

    updateTouchInterface();
    mediaQuery.addEventListener?.("change", updateTouchInterface);

    return () => {
      mediaQuery.removeEventListener?.("change", updateTouchInterface);
    };
  }, []);

  useEffect(() => {
    const nextCursor: CursorState = {
      ...localCursorDataRef.current,
      name: userName,
      size: currentSize,
      color,
      tool,
    };

    localCursorDataRef.current = nextCursor;

    if (localCursorVisibleRef.current) {
      applyCursorVisual(
        localCursorElementRef.current,
        localCursorLabelRef.current,
        nextCursor,
      );

      if (!isDrawingRef.current) {
        queueCursorBroadcast(nextCursor);
      }
    }
  }, [tool, brushSize, eraserSize, color, userName]);

  useEffect(() => {
    if (localCursorVisibleRef.current) {
      applyCursorVisual(
        localCursorElementRef.current,
        localCursorLabelRef.current,
        localCursorDataRef.current,
      );
    }

    for (const [remoteUserId, cursor] of remoteCursorDataRef.current) {
      applyCursorVisual(
        remoteCursorElementsRef.current.get(remoteUserId) ?? null,
        remoteCursorLabelsRef.current.get(remoteUserId) ?? null,
        cursor,
      );
    }
  }, [zoom]);

  useEffect(() => {
    let disposed = false;

    const supabase = createClient();
    const roomSessionId = crypto.randomUUID();

    roomSessionIdRef.current = roomSessionId;

    const channel = supabase.channel(`room:${roomCode}`, {
      config: {
        private: true,
        broadcast: {
          self: false,
        },
      },
    });

    channelRef.current = channel;

    async function heartbeatRoom() {
      if (disposed || !roomSessionIdRef.current) {
        return;
      }

      const { error } = await supabase.rpc(
        "heartbeat_room_session",
        {
          p_room_code: roomCode,
          p_session_id: roomSessionIdRef.current,
        },
      );

      if (error && !disposed) {
        console.error("Erro no heartbeat da sala:", error);
      }
    }

    supabase.realtime.onHeartbeat((status) => {
      if (status === "ok") {
        void heartbeatRoom();
      }
    });

    function syncParticipants() {
      const presenceState = channel.presenceState() as Record<
        string,
        PresencePayload[]
      >;

      const uniqueParticipants = new Map<string, Participant>();

      for (const presences of Object.values(presenceState)) {
        for (const presence of presences) {
          if (!presence.userId || !presence.name) {
            continue;
          }

          if (uniqueParticipants.has(presence.userId)) {
            continue;
          }

          uniqueParticipants.set(presence.userId, {
            userId: presence.userId,
            name: presence.name,
            avatarUrl: presence.avatarUrl ?? null,
            onlineAt: presence.onlineAt ?? "",
          });
        }
      }

      if (!uniqueParticipants.has(userId)) {
        uniqueParticipants.set(userId, {
          userId,
          name: userName,
          avatarUrl,
          onlineAt: "",
        });
      }

      const nextParticipants = [
        ...uniqueParticipants.values(),
      ].sort((first, second) => {
        if (first.userId === userId) {
          return -1;
        }

        if (second.userId === userId) {
          return 1;
        }

        return first.name.localeCompare(second.name, "pt-BR");
      });

      participantNamesRef.current = new Map(
        nextParticipants.map((participant) => [
          participant.userId,
          participant.name,
        ]),
      );

      const onlineIds = new Set(
        nextParticipants.map((participant) => participant.userId),
      );

      for (const remoteUserId of remoteCursorDataRef.current.keys()) {
        if (!onlineIds.has(remoteUserId)) {
          remoteCursorDataRef.current.delete(remoteUserId);
          hideCursorElement(
            remoteCursorElementsRef.current.get(remoteUserId) ?? null,
          );
        }
      }

      setParticipants(nextParticipants);
    }

    channel
      .on("presence", { event: "sync" }, syncParticipants)
      .on("presence", { event: "join" }, syncParticipants)
      .on("presence", { event: "leave" }, syncParticipants)
      .on("broadcast", { event: "cursor-move" }, ({ payload }) => {
        handleRemoteCursorMove(payload as CursorMovePayload);
      })
      .on("broadcast", { event: "cursor-leave" }, ({ payload }) => {
        handleRemoteCursorLeave(payload as CursorLeavePayload);
      })
      .on("broadcast", { event: "stroke-start" }, ({ payload }) => {
        handleRemoteStrokeStart(payload as StrokeStartPayload);
      })
      .on("broadcast", { event: "stroke-points" }, ({ payload }) => {
        handleRemoteStrokePoints(payload as StrokePointsPayload);
      })
      .on("broadcast", { event: "stroke-end" }, ({ payload }) => {
        handleRemoteStrokeEnd(payload as StrokeEndPayload);
      })
      .on("broadcast", { event: "stroke-remove" }, ({ payload }) => {
        handleRemoteStrokeRemove(payload as StrokeRemovePayload);
      })
      .on("broadcast", { event: "layer-add" }, ({ payload }) => {
        handleRemoteLayerAdd(payload as LayerAddPayload);
      })
      .on("broadcast", { event: "layer-delete" }, ({ payload }) => {
        handleRemoteLayerDelete(payload as LayerDeletePayload);
      })
      .on("broadcast", { event: "layer-restore" }, ({ payload }) => {
        handleRemoteLayerRestore(payload as LayerRestorePayload);
      })
      .on("broadcast", { event: "layer-update" }, ({ payload }) => {
        handleRemoteLayerUpdate(payload as LayerUpdatePayload);
      })
      .on("broadcast", { event: "layer-order" }, ({ payload }) => {
        handleRemoteLayerOrder(payload as LayerOrderPayload);
      })
      .on("broadcast", { event: "state-request" }, ({ payload }) => {
        handleStateRequest(payload as StateRequestPayload);
      })
      .on("broadcast", { event: "state-snapshot" }, ({ payload }) => {
        handleStateSnapshot(payload as StateSnapshotPayload);
      });

    async function connectRealtime() {
      await supabase.realtime.setAuth();

      if (disposed) {
        return;
      }

      channel.subscribe(async (status, error) => {
        if (disposed) {
          return;
        }

        if (status === "SUBSCRIBED") {
          const { error: sessionError } = await supabase.rpc(
            "start_room_session",
            {
              p_room_code: roomCode,
              p_session_id: roomSessionId,
            },
          );

          if (sessionError) {
            console.error(
              "Erro ao iniciar sessão da sala:",
              sessionError,
            );
            return;
          }

          realtimeConnectedRef.current = true;
          setRealtimeConnected(true);

          await channel.track({
            userId,
            name: userName,
            avatarUrl,
            onlineAt: new Date().toISOString(),
          });

          void heartbeatRoom();

          void channel.send({
            type: "broadcast",
            event: "state-request",
            payload: {
              userId,
            } satisfies StateRequestPayload,
          });

          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          realtimeConnectedRef.current = false;
          setRealtimeConnected(false);

          if (error) {
            console.error("Erro no Realtime:", error);
          }
        }
      });
    }

    void connectRealtime();

    return () => {
      disposed = true;
      realtimeConnectedRef.current = false;

      void channel.send({
        type: "broadcast",
        event: "cursor-leave",
        payload: {
          userId,
        } satisfies CursorLeavePayload,
      });

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      roomSessionIdRef.current = null;

      void supabase.rpc("end_room_session", {
        p_session_id: roomSessionId,
      });

      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [roomCode, userId, userName, avatarUrl]);

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

      const rect = workspace.getBoundingClientRect();

      const mouseX = event.clientX - (rect.left + rect.width / 2);
      const mouseY = event.clientY - (rect.top + rect.height / 2);

      const currentZoom = zoomRef.current;

      const nextZoom =
        event.deltaY < 0
          ? Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM)
          : Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);

      if (nextZoom === currentZoom) {
        return;
      }

      const currentScale = currentZoom / 100;
      const nextScale = nextZoom / 100;
      const currentPan = panRef.current;

      const pointX = (mouseX - currentPan.x) / currentScale;
      const pointY = (mouseY - currentPan.y) / currentScale;

      const nextPan = clampPan(
        {
          x: mouseX - pointX * nextScale,
          y: mouseY - pointY * nextScale,
        },
        nextZoom,
      );

      zoomRef.current = nextZoom;
      panRef.current = nextPan;

      setZoom(nextZoom);
      setPan(nextPan);
    }

    workspace.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      workspace.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isUndoShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z";

      if (!isUndoShortcut) {
        return;
      }

      event.preventDefault();
      handleUndo();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function sendBroadcast(event: string, payload: object) {
    const channel = channelRef.current;

    if (!channel || !realtimeConnectedRef.current) {
      return;
    }

    void channel.send({
      type: "broadcast",
      event,
      payload,
    });
  }

  function getPreviewContext(canvas: HTMLCanvasElement) {
    return canvas.getContext("2d", {
      desynchronized: true,
    });
  }

  function flushCursorBroadcast() {
    if (cursorBroadcastTimerRef.current !== null) {
      clearTimeout(cursorBroadcastTimerRef.current);
      cursorBroadcastTimerRef.current = null;
    }

    const pending = pendingCursorBroadcastRef.current;
    pendingCursorBroadcastRef.current = null;

    if (!pending || isDrawingRef.current) {
      return;
    }

    lastCursorBroadcastAtRef.current = performance.now();
    sendBroadcast("cursor-move", pending);
  }

  function queueCursorBroadcast(cursor: CursorState) {
    if (isDrawingRef.current) {
      return;
    }

    pendingCursorBroadcastRef.current = cursor;

    const elapsed =
      performance.now() - lastCursorBroadcastAtRef.current;

    if (elapsed >= CURSOR_BROADCAST_INTERVAL_MS) {
      flushCursorBroadcast();
      return;
    }

    if (cursorBroadcastTimerRef.current !== null) {
      return;
    }

    cursorBroadcastTimerRef.current = setTimeout(
      flushCursorBroadcast,
      CURSOR_BROADCAST_INTERVAL_MS - elapsed,
    );
  }

  function flushPendingStrokePoints() {
    if (strokeBroadcastTimerRef.current !== null) {
      clearTimeout(strokeBroadcastTimerRef.current);
      strokeBroadcastTimerRef.current = null;
    }

    const pending = pendingStrokePointsRef.current;
    pendingStrokePointsRef.current = null;

    if (!pending || pending.points.length === 0) {
      return;
    }

    sendBroadcast("stroke-points", {
      userId,
      layerId: pending.layerId,
      strokeId: pending.strokeId,
      points: pending.points,
    } satisfies StrokePointsPayload);
  }

  function queueStrokePointsBroadcast(
    layerId: string,
    strokeId: string,
    points: Point[],
  ) {
    if (points.length === 0) {
      return;
    }

    const pending = pendingStrokePointsRef.current;

    if (
      !pending ||
      pending.layerId !== layerId ||
      pending.strokeId !== strokeId
    ) {
      flushPendingStrokePoints();

      pendingStrokePointsRef.current = {
        layerId,
        strokeId,
        points: [],
      };
    }

    pendingStrokePointsRef.current?.points.push(...points);

    if (
      (pendingStrokePointsRef.current?.points.length ?? 0) >=
      MAX_POINTS_PER_PACKET
    ) {
      flushPendingStrokePoints();
      return;
    }

    if (strokeBroadcastTimerRef.current !== null) {
      return;
    }

    strokeBroadcastTimerRef.current = setTimeout(
      flushPendingStrokePoints,
      STROKE_BROADCAST_INTERVAL_MS,
    );
  }

  function applyCursorVisual(
    element: HTMLDivElement | null,
    label: HTMLDivElement | null,
    cursor: CursorState,
  ) {
    if (!element) {
      return;
    }

    element.style.display = "block";
    element.style.width = `${cursor.size}px`;
    element.style.height = `${cursor.size}px`;
    element.style.borderColor = cursor.color;
    element.style.transform =
      `translate3d(${cursor.x}px, ${cursor.y}px, 0) ` +
      "translate(-50%, -50%)";

    if (!label) {
      return;
    }

    const inverseZoom = 100 / zoomRef.current;

    label.style.borderColor = cursor.color;
    label.style.transform = `scale(${inverseZoom})`;
    label.style.transformOrigin = "top left";
    label.style.marginLeft = `${8 * inverseZoom}px`;
    label.style.marginTop = `${8 * inverseZoom}px`;
  }

  function hideCursorElement(element: HTMLDivElement | null) {
    if (!element) {
      return;
    }

    element.style.display = "none";
  }

  function registerRemoteCursorElement(
    remoteUserId: string,
    element: HTMLDivElement | null,
  ) {
    if (!element) {
      remoteCursorElementsRef.current.delete(remoteUserId);
      return;
    }

    remoteCursorElementsRef.current.set(remoteUserId, element);

    const cursor = remoteCursorDataRef.current.get(remoteUserId);

    if (cursor) {
      applyCursorVisual(
        element,
        remoteCursorLabelsRef.current.get(remoteUserId) ?? null,
        cursor,
      );
    } else {
      hideCursorElement(element);
    }
  }

  function registerRemoteCursorLabel(
    remoteUserId: string,
    element: HTMLDivElement | null,
  ) {
    if (!element) {
      remoteCursorLabelsRef.current.delete(remoteUserId);
      return;
    }

    remoteCursorLabelsRef.current.set(remoteUserId, element);

    const cursor = remoteCursorDataRef.current.get(remoteUserId);

    if (cursor) {
      applyCursorVisual(
        remoteCursorElementsRef.current.get(remoteUserId) ?? null,
        element,
        cursor,
      );
    }
  }

  function updateLocalCursor(point: Point, broadcast: boolean) {
    const cursor: CursorState = {
      userId,
      name: userName,
      x: point.x,
      y: point.y,
      size:
        typeof point.pressure === "number" && point.pressure > 0
          ? currentSize * getPointPressureScale(point)
          : currentSize,
      color,
      tool,
    };

    localCursorDataRef.current = cursor;
    localCursorVisibleRef.current = true;

    applyCursorVisual(
      localCursorElementRef.current,
      localCursorLabelRef.current,
      cursor,
    );

    if (broadcast) {
      queueCursorBroadcast(cursor);
    }
  }

  function hideLocalCursor() {
    localCursorVisibleRef.current = false;
    hideCursorElement(localCursorElementRef.current);

    pendingCursorBroadcastRef.current = null;

    if (cursorBroadcastTimerRef.current !== null) {
      clearTimeout(cursorBroadcastTimerRef.current);
      cursorBroadcastTimerRef.current = null;
    }

    sendBroadcast("cursor-leave", {
      userId,
    } satisfies CursorLeavePayload);
  }

  function updateRemoteCursorFromStroke(
    remoteUserId: string,
    stroke: Stroke,
    point: Point,
  ) {
    const existing = remoteCursorDataRef.current.get(remoteUserId);

    const cursor: CursorState = {
      userId: remoteUserId,
      name:
        participantNamesRef.current.get(remoteUserId) ??
        existing?.name ??
        "Usuário",
      x: point.x,
      y: point.y,
      size:
        typeof point.pressure === "number"
          ? stroke.size * getPointPressureScale(point)
          : stroke.size,
      color: stroke.color,
      tool: stroke.tool,
    };

    remoteCursorDataRef.current.set(remoteUserId, cursor);

    applyCursorVisual(
      remoteCursorElementsRef.current.get(remoteUserId) ?? null,
      remoteCursorLabelsRef.current.get(remoteUserId) ?? null,
      cursor,
    );
  }

  function handleRemoteCursorMove(payload: CursorMovePayload) {
    if (payload.userId === userId) {
      return;
    }

    remoteCursorDataRef.current.set(payload.userId, payload);

    applyCursorVisual(
      remoteCursorElementsRef.current.get(payload.userId) ?? null,
      remoteCursorLabelsRef.current.get(payload.userId) ?? null,
      payload,
    );
  }

  function handleRemoteCursorLeave(payload: CursorLeavePayload) {
    if (payload.userId === userId) {
      return;
    }

    remoteCursorDataRef.current.delete(payload.userId);

    hideCursorElement(
      remoteCursorElementsRef.current.get(payload.userId) ?? null,
    );
  }

  function commitLayers(nextLayers: Layer[]) {
    layersRef.current = nextLayers;
    setLayers(nextLayers);
  }

  function selectLayer(layerId: string) {
    activeLayerIdRef.current = layerId;
    setActiveLayerId(layerId);
  }

  function formatLayerName(number: number) {
    return String(number).padStart(2, "0");
  }

  function getLayerCanvas(layerId: string) {
    return (
      workspaceRef.current?.querySelector<HTMLCanvasElement>(
        `canvas[data-layer-id="${layerId}"]`,
      ) ?? null
    );
  }

  function getLayerThumbnailCanvas(layerId: string) {
    return document.querySelector<HTMLCanvasElement>(
      `canvas[data-layer-thumbnail-id="${layerId}"]`,
    );
  }

  function renderLayerThumbnail(layerId: string) {
    const sourceCanvas = getLayerCanvas(layerId);
    const thumbnailCanvas = getLayerThumbnailCanvas(layerId);

    if (!sourceCanvas || !thumbnailCanvas) {
      return;
    }

    const context = thumbnailCanvas.getContext("2d");

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

  function cloneStroke(stroke: Stroke): Stroke {
    return {
      ...stroke,
      points: stroke.points.map((point) => ({
        ...point,
      })),
    };
  }

  function ensureRemoteLayer(layerId: string) {
    const existing = layersRef.current.find(
      (layer) => layer.id === layerId,
    );

    if (existing) {
      return;
    }

    const nextNumber = layerCounterRef.current + 1;
    layerCounterRef.current = nextNumber;

    const layer: Layer = {
      id: layerId,
      name: formatLayerName(nextNumber),
      visible: true,
      opacity: 100,
    };

    strokesByLayerRef.current.set(layerId, []);

    commitLayers([
      ...layersRef.current,
      layer,
    ]);
  }

  function configureContext(
    context: CanvasRenderingContext2D,
    stroke: Stroke,
  ) {
    context.lineCap = "round";
    context.lineJoin = "round";

    if (stroke.tool === "brush") {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = stroke.color;
      context.fillStyle = stroke.color;
      return;
    }

    context.globalCompositeOperation = "destination-out";
    context.strokeStyle = "#000000";
    context.fillStyle = "#000000";
  }

  function getPointPressureScale(point: Point) {
    if (typeof point.pressure !== "number") {
      return 1;
    }

    const pressure = Math.max(0, Math.min(1, point.pressure));

    return MIN_PRESSURE_SCALE +
      (1 - MIN_PRESSURE_SCALE) * pressure;
  }

  function getStrokeWidth(
    stroke: Stroke,
    point: Point,
    renderScale: number,
  ) {
    return (
      stroke.size *
      getPointPressureScale(point) *
      renderScale
    );
  }

  function drawStrokePoint(
    context: CanvasRenderingContext2D,
    stroke: Stroke,
    point: Point,
    renderScale = PREVIEW_SCALE,
  ) {
    configureContext(context, stroke);

    const width = getStrokeWidth(
      stroke,
      point,
      renderScale,
    );

    context.beginPath();
    context.arc(
      point.x * renderScale,
      point.y * renderScale,
      width / 2,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  function drawStrokePolyline(
    context: CanvasRenderingContext2D,
    stroke: Stroke,
    from: Point,
    points: Point[],
    renderScale = PREVIEW_SCALE,
  ) {
    if (points.length === 0) {
      return;
    }

    configureContext(context, stroke);

    const hasPressure =
      typeof from.pressure === "number" ||
      points.some((point) => typeof point.pressure === "number");

    if (!hasPressure) {
      context.lineWidth = stroke.size * renderScale;
      context.beginPath();
      context.moveTo(
        from.x * renderScale,
        from.y * renderScale,
      );

      for (const point of points) {
        context.lineTo(
          point.x * renderScale,
          point.y * renderScale,
        );
      }

      context.stroke();
      return;
    }

    let previousPoint = from;

    for (const point of points) {
      const previousWidth = getStrokeWidth(
        stroke,
        previousPoint,
        renderScale,
      );
      const currentWidth = getStrokeWidth(
        stroke,
        point,
        renderScale,
      );

      context.lineWidth = (previousWidth + currentWidth) / 2;
      context.beginPath();
      context.moveTo(
        previousPoint.x * renderScale,
        previousPoint.y * renderScale,
      );
      context.lineTo(
        point.x * renderScale,
        point.y * renderScale,
      );
      context.stroke();

      previousPoint = point;
    }
  }

  function renderLayer(layerId: string) {
    const canvas = getLayerCanvas(layerId);

    if (!canvas) {
      return;
    }

    const context = getPreviewContext(canvas);

    if (!context) {
      return;
    }

    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, canvas.width, canvas.height);

    const strokes = strokesByLayerRef.current.get(layerId) ?? [];

    for (const stroke of strokes) {
      const firstPoint = stroke.points[0];

      if (!firstPoint) {
        continue;
      }

      drawStrokePoint(context, stroke, firstPoint);

      if (stroke.points.length > 1) {
        drawStrokePolyline(
          context,
          stroke,
          firstPoint,
          stroke.points.slice(1),
        );
      }
    }

    context.globalCompositeOperation = "source-over";
    renderLayerThumbnail(layerId);
  }

  function handleRemoteStrokeStart(payload: StrokeStartPayload) {
    if (payload.userId === userId) {
      return;
    }

    ensureRemoteLayer(payload.layerId);

    const strokes =
      strokesByLayerRef.current.get(payload.layerId) ?? [];

    if (
      strokes.some((stroke) => stroke.id === payload.stroke.id)
    ) {
      return;
    }

    const stroke = cloneStroke(payload.stroke);
    strokes.push(stroke);

    strokesByLayerRef.current.set(payload.layerId, strokes);

    remoteActiveStrokesRef.current.set(stroke.id, {
      layerId: payload.layerId,
      stroke,
    });

    const firstPoint = stroke.points[0];

    if (firstPoint) {
      updateRemoteCursorFromStroke(
        payload.userId,
        stroke,
        firstPoint,
      );
    }

    const canvas = getLayerCanvas(payload.layerId);
    const context = canvas ? getPreviewContext(canvas) : null;

    if (context && firstPoint) {
      drawStrokePoint(context, stroke, firstPoint);
      return;
    }

    requestAnimationFrame(() => {
      renderLayer(payload.layerId);
    });
  }

  function handleRemoteStrokePoints(payload: StrokePointsPayload) {
    if (payload.userId === userId) {
      return;
    }

    const currentStroke =
      remoteActiveStrokesRef.current.get(payload.strokeId);

    if (!currentStroke || payload.points.length === 0) {
      return;
    }

    const previousPoint =
      currentStroke.stroke.points[
        currentStroke.stroke.points.length - 1
      ];

    currentStroke.stroke.points.push(...payload.points);

    const canvas = getLayerCanvas(currentStroke.layerId);
    const context = canvas ? getPreviewContext(canvas) : null;

    if (context && previousPoint) {
      drawStrokePolyline(
        context,
        currentStroke.stroke,
        previousPoint,
        payload.points,
      );
    } else if (!context) {
      requestAnimationFrame(() => {
        renderLayer(currentStroke.layerId);
      });
    }

    const lastPoint = payload.points[payload.points.length - 1];

    updateRemoteCursorFromStroke(
      payload.userId,
      currentStroke.stroke,
      lastPoint,
    );
  }

  function handleRemoteStrokeEnd(payload: StrokeEndPayload) {
    if (payload.userId === userId) {
      return;
    }

    remoteActiveStrokesRef.current.delete(payload.strokeId);
    renderLayerThumbnail(payload.layerId);
  }

  function handleRemoteStrokeRemove(payload: StrokeRemovePayload) {
    if (payload.userId === userId) {
      return;
    }

    const strokes =
      strokesByLayerRef.current.get(payload.layerId);

    if (!strokes) {
      return;
    }

    const index = strokes.findIndex(
      (stroke) => stroke.id === payload.strokeId,
    );

    if (index === -1) {
      return;
    }

    strokes.splice(index, 1);
    remoteActiveStrokesRef.current.delete(payload.strokeId);
    renderLayer(payload.layerId);
  }

  function handleRemoteLayerAdd(payload: LayerAddPayload) {
    if (payload.userId === userId) {
      return;
    }

    if (
      layersRef.current.some(
        (layer) => layer.id === payload.layer.id,
      )
    ) {
      return;
    }

    strokesByLayerRef.current.set(payload.layer.id, []);

    const numericName = Number.parseInt(payload.layer.name, 10);

    if (Number.isFinite(numericName)) {
      layerCounterRef.current = Math.max(
        layerCounterRef.current,
        numericName,
      );
    }

    commitLayers([
      ...layersRef.current,
      payload.layer,
    ]);

    requestAnimationFrame(() => {
      renderLayer(payload.layer.id);
    });
  }

  function handleRemoteLayerDelete(payload: LayerDeletePayload) {
    if (payload.userId === userId) {
      return;
    }

    const remainingLayers = layersRef.current.filter(
      (layer) => layer.id !== payload.layerId,
    );

    if (remainingLayers.length === layersRef.current.length) {
      return;
    }

    strokesByLayerRef.current.delete(payload.layerId);

    remoteActiveStrokesRef.current.forEach(
      (currentStroke, strokeId) => {
        if (currentStroke.layerId === payload.layerId) {
          remoteActiveStrokesRef.current.delete(strokeId);
        }
      },
    );

    historyRef.current = historyRef.current.filter(
      (entry) => entry.layerId !== payload.layerId,
    );

    commitLayers(remainingLayers);
    setUndoAvailable(historyRef.current.length);

    if (
      activeLayerIdRef.current === payload.layerId &&
      remainingLayers.length > 0
    ) {
      selectLayer(
        remainingLayers[remainingLayers.length - 1].id,
      );
    }
  }

  function handleRemoteLayerRestore(payload: LayerRestorePayload) {
    if (payload.userId === userId) {
      return;
    }

    if (
      layersRef.current.some(
        (layer) => layer.id === payload.layer.id,
      )
    ) {
      return;
    }

    strokesByLayerRef.current.set(
      payload.layer.id,
      payload.strokes.map(cloneStroke),
    );

    const numericName = Number.parseInt(payload.layer.name, 10);

    if (Number.isFinite(numericName)) {
      layerCounterRef.current = Math.max(
        layerCounterRef.current,
        numericName,
      );
    }

    const layerMap = new Map<string, Layer>([
      ...layersRef.current.map(
        (layer) => [layer.id, layer] as const,
      ),
      [payload.layer.id, { ...payload.layer }] as const,
    ]);

    const orderedLayers: Layer[] = [];

    for (const layerId of payload.layerIds) {
      const layer = layerMap.get(layerId);

      if (!layer) {
        continue;
      }

      orderedLayers.push(layer);
      layerMap.delete(layerId);
    }

    orderedLayers.push(...layerMap.values());
    commitLayers(orderedLayers);

    requestAnimationFrame(() => {
      renderLayer(payload.layer.id);
    });
  }

  function handleRemoteLayerUpdate(payload: LayerUpdatePayload) {
    if (payload.userId === userId) {
      return;
    }

    const nextLayers = layersRef.current.map((layer) => {
      if (layer.id !== payload.layerId) {
        return layer;
      }

      return {
        ...layer,
        visible: payload.visible ?? layer.visible,
        opacity: payload.opacity ?? layer.opacity,
      };
    });

    commitLayers(nextLayers);
  }

  function handleRemoteLayerOrder(payload: LayerOrderPayload) {
    if (payload.userId === userId) {
      return;
    }

    const layerMap = new Map<string, Layer>(
      layersRef.current.map((layer) => [layer.id, layer]),
    );

    const ordered: Layer[] = [];

    for (const layerId of payload.layerIds) {
      const layer = layerMap.get(layerId);

      if (!layer) {
        continue;
      }

      ordered.push(layer);
      layerMap.delete(layerId);
    }

    ordered.push(...layerMap.values());
    commitLayers(ordered);
  }

  function handleStateRequest(payload: StateRequestPayload) {
    if (payload.userId === userId) {
      return;
    }

    const serializedStrokes: SerializedLayerStrokes[] = [
      ...strokesByLayerRef.current.entries(),
    ].map(([layerId, strokes]) => ({
      layerId,
      strokes: strokes.map(cloneStroke),
    }));

    sendBroadcast("state-snapshot", {
      userId,
      targetUserId: payload.userId,
      layers: layersRef.current.map((layer) => ({
        ...layer,
      })),
      strokes: serializedStrokes,
    } satisfies StateSnapshotPayload);
  }

  function handleStateSnapshot(payload: StateSnapshotPayload) {
    if (
      payload.targetUserId !== userId ||
      payload.userId === userId ||
      hasReceivedSnapshotRef.current
    ) {
      return;
    }

    if (payload.layers.length === 0) {
      return;
    }

    hasReceivedSnapshotRef.current = true;

    const nextLayers = payload.layers.map((layer) => ({
      ...layer,
    }));

    const nextStrokes = new Map<string, Stroke[]>();

    for (const layer of nextLayers) {
      nextStrokes.set(layer.id, []);
    }

    for (const entry of payload.strokes) {
      nextStrokes.set(
        entry.layerId,
        entry.strokes.map(cloneStroke),
      );
    }

    strokesByLayerRef.current = nextStrokes;
    historyRef.current = [];
    remoteActiveStrokesRef.current.clear();

    setUndoAvailable(0);
    commitLayers(nextLayers);

    const numericNames = nextLayers
      .map((layer) => Number.parseInt(layer.name, 10))
      .filter(Number.isFinite);

    layerCounterRef.current =
      numericNames.length > 0
        ? Math.max(...numericNames)
        : nextLayers.length;

    selectLayer(nextLayers[nextLayers.length - 1].id);

    requestAnimationFrame(() => {
      for (const layer of nextLayers) {
        renderLayer(layer.id);
      }
    });
  }

  function clampPan(
    nextPan: Point,
    zoomValue: number = zoomRef.current,
  ) {
    const workspace = workspaceRef.current;

    if (!workspace) {
      return nextPan;
    }

    const rect = workspace.getBoundingClientRect();
    const scale = zoomValue / 100;

    const scaledPageWidth = PAGE_WIDTH * scale;
    const scaledPageHeight = PAGE_HEIGHT * scale;

    const maxPanX = Math.max(
      0,
      rect.width / 2 +
        scaledPageWidth / 2 -
        MIN_VISIBLE_PAGE,
    );

    const maxPanY = Math.max(
      0,
      rect.height / 2 +
        scaledPageHeight / 2 -
        MIN_VISIBLE_PAGE,
    );

    return {
      x: Math.max(-maxPanX, Math.min(nextPan.x, maxPanX)),
      y: Math.max(-maxPanY, Math.min(nextPan.y, maxPanY)),
    };
  }

  function normalizePointerPressure(pointerEvent: PointerEvent) {
    if (pointerEvent.pointerType !== "pen") {
      return undefined;
    }

    return Math.max(0, Math.min(1, pointerEvent.pressure));
  }

  function getCanvasPointFromClient(
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
    pressure?: number,
  ): Point {
    const rect = canvas.getBoundingClientRect();

    return {
      x:
        (clientX - rect.left) *
        (PAGE_WIDTH / rect.width),
      y:
        (clientY - rect.top) *
        (PAGE_HEIGHT / rect.height),
      ...(typeof pressure === "number" ? { pressure } : {}),
    };
  }

  function getCanvasPointFromPointer(
    canvas: HTMLCanvasElement,
    pointerEvent: PointerEvent,
  ) {
    return getCanvasPointFromClient(
      canvas,
      pointerEvent.clientX,
      pointerEvent.clientY,
      normalizePointerPressure(pointerEvent),
    );
  }

  function getCanvasPoint(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    return getCanvasPointFromPointer(
      event.currentTarget,
      event.nativeEvent,
    );
  }

  function pointDistanceSquared(first: Point, second: Point) {
    const dx = first.x - second.x;
    const dy = first.y - second.y;

    return dx * dx + dy * dy;
  }

  function getTouchPair() {
    return [...activeTouchPointersRef.current.values()].slice(0, 2);
  }

  function getTouchDistance(first: Point, second: Point) {
    return Math.hypot(
      second.x - first.x,
      second.y - first.y,
    );
  }

  function getTouchCentroid(first: Point, second: Point) {
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    };
  }

  function cancelActiveStrokeForTouchGesture() {
    const currentStroke = currentStrokeRef.current;

    if (!isDrawingRef.current || !currentStroke) {
      isDrawingRef.current = false;
      lastDrawingPointRef.current = null;
      currentStrokeRef.current = null;
      return;
    }

    flushPendingStrokePoints();

    const strokes =
      strokesByLayerRef.current.get(currentStroke.layerId) ?? [];

    const strokeIndex = strokes.findIndex(
      (stroke) => stroke.id === currentStroke.stroke.id,
    );

    if (strokeIndex >= 0) {
      strokes.splice(strokeIndex, 1);
    }

    sendBroadcast("stroke-remove", {
      userId,
      layerId: currentStroke.layerId,
      strokeId: currentStroke.stroke.id,
    } satisfies StrokeRemovePayload);

    isDrawingRef.current = false;
    lastDrawingPointRef.current = null;
    currentStrokeRef.current = null;

    renderLayer(currentStroke.layerId);
  }

  function beginTouchGesture() {
    const workspace = workspaceRef.current;
    const points = getTouchPair();

    if (!workspace || points.length < 2) {
      return;
    }

    const [first, second] = points;
    const distance = getTouchDistance(first, second);

    if (distance <= 0) {
      return;
    }

    const centroid = getTouchCentroid(first, second);
    const rect = workspace.getBoundingClientRect();
    const relativeX = centroid.x - (rect.left + rect.width / 2);
    const relativeY = centroid.y - (rect.top + rect.height / 2);
    const scale = zoomRef.current / 100;

    touchGestureRef.current = {
      startDistance: distance,
      startZoom: zoomRef.current,
      anchorX: (relativeX - panRef.current.x) / scale,
      anchorY: (relativeY - panRef.current.y) / scale,
    };

    touchGestureActiveRef.current = true;
    blockTouchDrawingRef.current = true;
    hideLocalCursor();
  }

  function updateTouchGesture() {
    const workspace = workspaceRef.current;
    const gesture = touchGestureRef.current;
    const points = getTouchPair();

    if (!workspace || !gesture || points.length < 2) {
      return;
    }

    const [first, second] = points;
    const distance = getTouchDistance(first, second);

    if (distance <= 0) {
      return;
    }

    const zoomRatio = distance / gesture.startDistance;
    const nextZoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, gesture.startZoom * zoomRatio),
    );

    const centroid = getTouchCentroid(first, second);
    const rect = workspace.getBoundingClientRect();
    const relativeX = centroid.x - (rect.left + rect.width / 2);
    const relativeY = centroid.y - (rect.top + rect.height / 2);
    const nextScale = nextZoom / 100;

    const nextPan = clampPan(
      {
        x: relativeX - gesture.anchorX * nextScale,
        y: relativeY - gesture.anchorY * nextScale,
      },
      nextZoom,
    );

    zoomRef.current = nextZoom;
    panRef.current = nextPan;

    setZoom(nextZoom);
    setPan(nextPan);
  }

  function handleUndo() {
    const historyEntry = historyRef.current.pop();

    if (!historyEntry) {
      return;
    }

    if (historyEntry.type === "layer-delete") {
      if (
        layersRef.current.some(
          (layer) => layer.id === historyEntry.layerId,
        )
      ) {
        setUndoAvailable(historyRef.current.length);
        return;
      }

      const restoredLayer = { ...historyEntry.layer };
      const restoredStrokes = historyEntry.strokes.map(cloneStroke);
      const restoredLayers = [...layersRef.current];
      const safeIndex = Math.max(
        0,
        Math.min(historyEntry.index, restoredLayers.length),
      );

      restoredLayers.splice(safeIndex, 0, restoredLayer);

      strokesByLayerRef.current.set(
        restoredLayer.id,
        restoredStrokes,
      );

      commitLayers(restoredLayers);

      if (historyEntry.wasActive) {
        selectLayer(restoredLayer.id);
      }

      setUndoAvailable(historyRef.current.length);

      requestAnimationFrame(() => {
        renderLayer(restoredLayer.id);
      });

      sendBroadcast("layer-restore", {
        userId,
        layer: restoredLayer,
        strokes: restoredStrokes.map(cloneStroke),
        layerIds: restoredLayers.map((layer) => layer.id),
      } satisfies LayerRestorePayload);

      return;
    }

    const strokes =
      strokesByLayerRef.current.get(historyEntry.layerId);

    if (!strokes) {
      setUndoAvailable(historyRef.current.length);
      return;
    }

    const strokeIndex = strokes.findIndex(
      (stroke) => stroke.id === historyEntry.strokeId,
    );

    if (strokeIndex >= 0) {
      strokes.splice(strokeIndex, 1);
    }

    renderLayer(historyEntry.layerId);
    setUndoAvailable(historyRef.current.length);

    sendBroadcast("stroke-remove", {
      userId,
      layerId: historyEntry.layerId,
      strokeId: historyEntry.strokeId,
    } satisfies StrokeRemovePayload);
  }

  function handleCanvasPointerEnter(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (event.pointerType === "touch") {
      return;
    }

    const point = getCanvasPoint(event);
    updateLocalCursor(point, !isDrawingRef.current);
  }

  function handleCanvasPointerLeave(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (event.pointerType === "touch" || isDrawingRef.current) {
      return;
    }

    hideLocalCursor();
  }

  function handleCanvasPointerDown(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (event.pointerType === "touch") {
      event.preventDefault();

      if (activePenPointerIdRef.current !== null) {
        return;
      }

      if (
        blockTouchDrawingRef.current ||
        activeTouchPointersRef.current.size >= 1
      ) {
        return;
      }
    }

    const point = getCanvasPoint(event);

    if (event.pointerType !== "touch") {
      updateLocalCursor(point, false);
    }

    if (
      event.button !== 0 ||
      !activeLayer ||
      !activeLayer.visible
    ) {
      return;
    }

    const canvas = event.currentTarget;
    const context = getPreviewContext(canvas);

    if (!context) {
      return;
    }

    if (event.pointerType === "pen") {
      activePenPointerIdRef.current = event.pointerId;
    }

    const stroke: Stroke = {
      id: crypto.randomUUID(),
      tool,
      color,
      size: tool === "brush" ? brushSize : eraserSize,
      points: [point],
    };

    const strokes =
      strokesByLayerRef.current.get(activeLayerId) ?? [];

    strokes.push(stroke);
    strokesByLayerRef.current.set(activeLayerId, strokes);

    canvas.setPointerCapture(event.pointerId);

    isDrawingRef.current = true;
    lastDrawingPointRef.current = point;

    currentStrokeRef.current = {
      layerId: activeLayerId,
      stroke,
    };

    pendingCursorBroadcastRef.current = null;

    if (cursorBroadcastTimerRef.current !== null) {
      clearTimeout(cursorBroadcastTimerRef.current);
      cursorBroadcastTimerRef.current = null;
    }

    drawStrokePoint(context, stroke, point);

    sendBroadcast("stroke-start", {
      userId,
      layerId: activeLayerId,
      stroke: cloneStroke(stroke),
    } satisfies StrokeStartPayload);
  }

  function handleCanvasPointerMove(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (event.pointerType === "touch") {
      if (
        activePenPointerIdRef.current !== null ||
        touchGestureActiveRef.current ||
        blockTouchDrawingRef.current
      ) {
        return;
      }
    }

    const canvas = event.currentTarget;
    const nativeEvent = event.nativeEvent;

    const coalescedEvents =
      nativeEvent.getCoalescedEvents?.() ?? [];

    const pointerEvents =
      coalescedEvents.length > 0
        ? coalescedEvents
        : [nativeEvent];

    const finalEvent = pointerEvents[pointerEvents.length - 1];
    const finalPoint = getCanvasPointFromPointer(
      canvas,
      finalEvent,
    );

    if (!isDrawingRef.current) {
      if (event.pointerType !== "touch") {
        updateLocalCursor(finalPoint, true);
      }

      return;
    }

    if (event.pointerType !== "touch") {
      updateLocalCursor(finalPoint, false);
    }

    const currentStroke = currentStrokeRef.current;

    if (!currentStroke) {
      return;
    }

    const context = getPreviewContext(canvas);

    if (!context) {
      return;
    }

    const startPoint = lastDrawingPointRef.current;

    if (!startPoint) {
      lastDrawingPointRef.current = finalPoint;
      return;
    }

    const newPoints: Point[] = [];
    let comparisonPoint = startPoint;

    for (const pointerEvent of pointerEvents) {
      const point = getCanvasPointFromPointer(
        canvas,
        pointerEvent,
      );

      if (
        pointDistanceSquared(point, comparisonPoint) <
        MIN_POINT_DISTANCE * MIN_POINT_DISTANCE
      ) {
        continue;
      }

      newPoints.push(point);
      comparisonPoint = point;
    }

    if (newPoints.length === 0) {
      return;
    }

    currentStroke.stroke.points.push(...newPoints);

    drawStrokePolyline(
      context,
      currentStroke.stroke,
      startPoint,
      newPoints,
    );

    lastDrawingPointRef.current = newPoints[newPoints.length - 1];

    queueStrokePointsBroadcast(
      currentStroke.layerId,
      currentStroke.stroke.id,
      newPoints,
    );
  }

  function handleCanvasPointerUp(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = event.currentTarget;

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (
      event.pointerType === "touch" &&
      (touchGestureActiveRef.current || blockTouchDrawingRef.current)
    ) {
      return;
    }

    const currentStroke = currentStrokeRef.current;

    if (isDrawingRef.current && currentStroke) {
      flushPendingStrokePoints();

      historyRef.current.push({
        type: "stroke",
        layerId: currentStroke.layerId,
        strokeId: currentStroke.stroke.id,
      });

      if (historyRef.current.length > MAX_UNDO_STEPS) {
        historyRef.current.shift();
      }

      setUndoAvailable(historyRef.current.length);
      renderLayerThumbnail(currentStroke.layerId);

      sendBroadcast("stroke-end", {
        userId,
        layerId: currentStroke.layerId,
        strokeId: currentStroke.stroke.id,
      } satisfies StrokeEndPayload);
    }

    isDrawingRef.current = false;
    lastDrawingPointRef.current = null;
    currentStrokeRef.current = null;

    if (event.pointerType === "pen") {
      activePenPointerIdRef.current = null;
    }

    if (event.pointerType === "touch") {
      hideLocalCursor();
      return;
    }

    const rect = canvas.getBoundingClientRect();

    const pointerInside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!pointerInside) {
      hideLocalCursor();
      return;
    }

    const point = getCanvasPoint(event);
    updateLocalCursor(point, true);
  }

  function handleWorkspacePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (event.pointerType === "touch") {
      event.preventDefault();

      if (activePenPointerIdRef.current !== null) {
        return;
      }

      activeTouchPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (activeTouchPointersRef.current.size >= 2) {
        cancelActiveStrokeForTouchGesture();

        if (!touchGestureActiveRef.current) {
          beginTouchGesture();
        }
      }

      return;
    }

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

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleWorkspacePointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (event.pointerType === "touch") {
      if (activePenPointerIdRef.current !== null) {
        return;
      }

      if (activeTouchPointersRef.current.has(event.pointerId)) {
        activeTouchPointersRef.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
      }

      if (
        touchGestureActiveRef.current &&
        activeTouchPointersRef.current.size >= 2
      ) {
        updateTouchGesture();
      }

      return;
    }

    if (!isPanningRef.current) {
      return;
    }

    const lastPoint = lastPanPointRef.current;

    if (!lastPoint) {
      return;
    }

    const nextPan = clampPan({
      x:
        panRef.current.x +
        event.clientX -
        lastPoint.x,
      y:
        panRef.current.y +
        event.clientY -
        lastPoint.y,
    });

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
    if (event.pointerType === "touch") {
      activeTouchPointersRef.current.delete(event.pointerId);

      if (activeTouchPointersRef.current.size < 2) {
        touchGestureActiveRef.current = false;
        touchGestureRef.current = null;
      }

      if (activeTouchPointersRef.current.size === 0) {
        blockTouchDrawingRef.current = false;
      }

      return;
    }

    if (!isPanningRef.current) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    isPanningRef.current = false;
    lastPanPointRef.current = null;
    setIsPanning(false);
  }

  function handleSizeChange(value: number) {
    if (tool === "brush") {
      setBrushSize(value);
      return;
    }

    setEraserSize(value);
  }

  function addLayer() {
    layerCounterRef.current += 1;

    const layerId = crypto.randomUUID();

    const newLayer: Layer = {
      id: layerId,
      name: formatLayerName(layerCounterRef.current),
      visible: true,
      opacity: 100,
    };

    strokesByLayerRef.current.set(layerId, []);

    commitLayers([
      ...layersRef.current,
      newLayer,
    ]);

    selectLayer(layerId);

    sendBroadcast("layer-add", {
      userId,
      layer: newLayer,
    } satisfies LayerAddPayload);
  }

  function toggleLayerVisibility(layerId: string) {
    const currentLayer = layersRef.current.find(
      (layer) => layer.id === layerId,
    );

    if (!currentLayer) {
      return;
    }

    const visible = !currentLayer.visible;

    commitLayers(
      layersRef.current.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              visible,
            }
          : layer,
      ),
    );

    sendBroadcast("layer-update", {
      userId,
      layerId,
      visible,
    } satisfies LayerUpdatePayload);
  }

  function changeLayerOpacity(
    layerId: string,
    opacity: number,
  ) {
    const safeOpacity = Math.max(0, Math.min(100, opacity));

    commitLayers(
      layersRef.current.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              opacity: safeOpacity,
            }
          : layer,
      ),
    );

    sendBroadcast("layer-update", {
      userId,
      layerId,
      opacity: safeOpacity,
    } satisfies LayerUpdatePayload);
  }

  function deleteLayer(layerId: string) {
    if (layersRef.current.length <= 1) {
      return;
    }

    const layerIndex = layersRef.current.findIndex(
      (layer) => layer.id === layerId,
    );

    if (layerIndex === -1) {
      return;
    }

    const deletedLayer = layersRef.current[layerIndex];
    const deletedStrokes =
      strokesByLayerRef.current.get(layerId) ?? [];

    historyRef.current.push({
      type: "layer-delete",
      layerId,
      layer: { ...deletedLayer },
      strokes: deletedStrokes.map(cloneStroke),
      index: layerIndex,
      wasActive: activeLayerIdRef.current === layerId,
    });

    if (historyRef.current.length > MAX_UNDO_STEPS) {
      historyRef.current.shift();
    }

    const remainingLayers = layersRef.current.filter(
      (layer) => layer.id !== layerId,
    );

    strokesByLayerRef.current.delete(layerId);

    remoteActiveStrokesRef.current.forEach(
      (currentStroke, strokeId) => {
        if (currentStroke.layerId === layerId) {
          remoteActiveStrokesRef.current.delete(strokeId);
        }
      },
    );

    commitLayers(remainingLayers);
    setUndoAvailable(historyRef.current.length);

    if (activeLayerIdRef.current === layerId) {
      const nextActiveIndex = Math.min(
        layerIndex,
        remainingLayers.length - 1,
      );

      selectLayer(remainingLayers[nextActiveIndex].id);
    }

    sendBroadcast("layer-delete", {
      userId,
      layerId,
    } satisfies LayerDeletePayload);
  }

  function reorderLayers(
    currentLayers: Layer[],
    draggedLayerId: string,
    targetLayerId: string,
    position: "before" | "after",
  ) {
    const displayedLayers = [...currentLayers].reverse();

    const draggedIndex = displayedLayers.findIndex(
      (layer) => layer.id === draggedLayerId,
    );

    if (draggedIndex === -1) {
      return currentLayers;
    }

    const [draggedLayer] = displayedLayers.splice(
      draggedIndex,
      1,
    );

    const targetIndex = displayedLayers.findIndex(
      (layer) => layer.id === targetLayerId,
    );

    if (targetIndex === -1) {
      return currentLayers;
    }

    const insertIndex =
      position === "after" ? targetIndex + 1 : targetIndex;

    displayedLayers.splice(insertIndex, 0, draggedLayer);

    return displayedLayers.reverse();
  }

  function moveLayer(
    layerId: string,
    direction: "up" | "down",
  ) {
    const currentLayers = [...layersRef.current];
    const currentIndex = currentLayers.findIndex(
      (layer) => layer.id === layerId,
    );

    if (currentIndex === -1) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? currentIndex + 1
        : currentIndex - 1;

    if (
      targetIndex < 0 ||
      targetIndex >= currentLayers.length
    ) {
      return;
    }

    const [movedLayer] = currentLayers.splice(currentIndex, 1);
    currentLayers.splice(targetIndex, 0, movedLayer);

    commitLayers(currentLayers);

    sendBroadcast("layer-order", {
      userId,
      layerIds: currentLayers.map((layer) => layer.id),
    } satisfies LayerOrderPayload);
  }

  function handleLayerDragStart(
    event: ReactDragEvent,
    layerId: string,
  ) {
    draggedLayerIdRef.current = layerId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", layerId);
  }

  function handleLayerDragOver(
    event: ReactDragEvent,
    layerId: string,
  ) {
    event.preventDefault();

    const draggedLayerId = draggedLayerIdRef.current;

    if (!draggedLayerId || draggedLayerId === layerId) {
      setDragOverLayer(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const position =
      event.clientY < rect.top + rect.height / 2
        ? "before"
        : "after";

    setDragOverLayer({
      id: layerId,
      position,
    });

    event.dataTransfer.dropEffect = "move";
  }

  function handleLayerDrop(
    event: ReactDragEvent,
    targetLayerId: string,
  ) {
    event.preventDefault();

    const draggedLayerId = draggedLayerIdRef.current;

    if (!draggedLayerId || draggedLayerId === targetLayerId) {
      draggedLayerIdRef.current = null;
      setDragOverLayer(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const position: "before" | "after" =
      event.clientY < rect.top + rect.height / 2
        ? "before"
        : "after";

    const nextLayers = reorderLayers(
      layersRef.current,
      draggedLayerId,
      targetLayerId,
      position,
    );

    commitLayers(nextLayers);

    sendBroadcast("layer-order", {
      userId,
      layerIds: nextLayers.map((layer) => layer.id),
    } satisfies LayerOrderPayload);

    draggedLayerIdRef.current = null;
    setDragOverLayer(null);
  }

  function handleLayerDragEnd() {
    draggedLayerIdRef.current = null;
    setDragOverLayer(null);
  }

  function handleDownload() {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = PAGE_WIDTH;
    exportCanvas.height = PAGE_HEIGHT;

    const exportContext = exportCanvas.getContext("2d");

    if (!exportContext) {
      return;
    }

    exportContext.globalCompositeOperation = "source-over";
    exportContext.globalAlpha = 1;
    exportContext.fillStyle = "#ffffff";
    exportContext.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    const layerCanvas = document.createElement("canvas");
    layerCanvas.width = PAGE_WIDTH;
    layerCanvas.height = PAGE_HEIGHT;

    const layerContext = layerCanvas.getContext("2d");

    if (!layerContext) {
      return;
    }

    for (const layer of layersRef.current) {
      if (!layer.visible || layer.opacity <= 0) {
        continue;
      }

      layerContext.globalCompositeOperation = "source-over";
      layerContext.globalAlpha = 1;
      layerContext.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

      const strokes = strokesByLayerRef.current.get(layer.id) ?? [];

      for (const stroke of strokes) {
        const firstPoint = stroke.points[0];

        if (!firstPoint) {
          continue;
        }

        drawStrokePoint(
          layerContext,
          stroke,
          firstPoint,
          1,
        );

        if (stroke.points.length > 1) {
          drawStrokePolyline(
            layerContext,
            stroke,
            firstPoint,
            stroke.points.slice(1),
            1,
          );
        }
      }

      exportContext.globalCompositeOperation = "source-over";
      exportContext.globalAlpha = layer.opacity / 100;
      exportContext.drawImage(layerCanvas, 0, 0);
    }

    exportContext.globalAlpha = 1;

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = `box-${roomCode.toLowerCase()}.png`;

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(url);
      },
      "image/png",
    );
  }

  function getParticipantInitial(name: string) {
    return name.trim().charAt(0).toUpperCase() || "?";
  }

  function renderLayerItems(mobile = false) {
    return [...layers].reverse().map((layer) => {
      const isActive = layer.id === activeLayerId;
      const isDragOver = dragOverLayer?.id === layer.id;
      const layerIndex = layers.findIndex(
        (currentLayer) => currentLayer.id === layer.id,
      );

      return (
        <div
          key={layer.id}
          onClick={() => selectLayer(layer.id)}
          onDragOver={
            mobile
              ? undefined
              : (event) => handleLayerDragOver(event, layer.id)
          }
          onDrop={
            mobile
              ? undefined
              : (event) => handleLayerDrop(event, layer.id)
          }
          className={`group relative rounded-xl border p-2 transition ${
            isActive
              ? "border-[#ff1152]/40 bg-[#ff1152]/10"
              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
          } ${
            !mobile && isDragOver && dragOverLayer?.position === "before"
              ? "before:absolute before:left-0 before:right-0 before:top-[-5px] before:h-[2px] before:rounded-full before:bg-[#ff1152]"
              : ""
          } ${
            !mobile && isDragOver && dragOverLayer?.position === "after"
              ? "after:absolute after:bottom-[-5px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-[#ff1152]"
              : ""
          }`}
        >
          <div className="flex cursor-pointer items-center gap-2">
            {mobile ? (
              <div
                className="flex shrink-0 flex-col gap-1"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  title="Mover camada para cima"
                  disabled={layerIndex === layers.length - 1}
                  onClick={() => moveLayer(layer.id, "up")}
                  className="flex h-7 w-8 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.07] hover:text-white disabled:opacity-20"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  title="Mover camada para baixo"
                  disabled={layerIndex === 0}
                  onClick={() => moveLayer(layer.id, "down")}
                  className="flex h-7 w-8 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.07] hover:text-white disabled:opacity-20"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            ) : (
              <div
                draggable
                title="Arrastar para reordenar"
                onDragStart={(event) =>
                  handleLayerDragStart(event, layer.id)
                }
                onDragEnd={handleLayerDragEnd}
                onClick={(event) => event.stopPropagation()}
                className="flex h-9 w-5 shrink-0 cursor-grab items-center justify-center text-white/20 transition hover:text-white/60 active:cursor-grabbing"
              >
                <GripVertical size={16} />
              </div>
            )}

            <button
              type="button"
              title={layer.visible ? "Ocultar camada" : "Mostrar camada"}
              onClick={(event) => {
                event.stopPropagation();
                toggleLayerVisibility(layer.id);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white"
            >
              {layer.visible ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>

            <div
              className={`relative shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white shadow-sm ${
                mobile ? "h-14 w-20" : "h-12 w-[68px]"
              }`}
            >
              <canvas
                data-layer-thumbnail-id={layer.id}
                width={THUMBNAIL_WIDTH}
                height={THUMBNAIL_HEIGHT}
                className="h-full w-full"
                style={{
                  opacity: layer.opacity / 100,
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`${mobile ? "text-base" : "text-sm"} font-black ${
                  isActive ? "text-white" : "text-white/60"
                }`}
              >
                {layer.name}
              </p>

              <p className="mt-0.5 text-[11px] font-medium text-white/25">
                {layer.visible ? "Visível" : "Oculta"}
              </p>
            </div>

            <button
              type="button"
              title="Excluir camada"
              disabled={mounted ? layers.length === 1 : false}
              onClick={(event) => {
                event.stopPropagation();
                deleteLayer(layer.id);
              }}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/25 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-20 ${
                mobile ? "" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div
            className={`mt-2 flex items-center gap-2 ${mobile ? "pl-1" : "pl-7"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="w-16 shrink-0 text-[11px] font-bold text-white/30">
              Opacidade
            </span>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={layer.opacity}
              onChange={(event) =>
                changeLayerOpacity(
                  layer.id,
                  Number(event.target.value),
                )
              }
              className="min-w-0 flex-1 accent-[#ff1152]"
            />

            <span className="w-10 shrink-0 text-right text-[11px] font-bold text-white/40">
              {layer.opacity}%
            </span>
          </div>
        </div>
      );
    });
  }

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden overscroll-none bg-[#09090d] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0d0d12] px-3 md:h-16 md:px-4">
        <div className="flex min-w-0 items-center gap-3 md:gap-5">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff1152] font-black">
              B
            </div>
            <span className="hidden text-xl font-black sm:inline">box</span>
          </Link>

          <div className="hidden h-7 w-px bg-white/10 md:block" />

          <div className="hidden md:block">
            <p className="text-sm font-bold">
              Sala {roomCode.toUpperCase()}
            </p>

            <div className="mt-0.5 flex items-center gap-1.5">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  realtimeConnected
                    ? "bg-emerald-400"
                    : "bg-yellow-400"
                }`}
              />

              <p className="text-xs font-medium text-white/30">
                {realtimeConnected
                  ? `${participantCount} de ${MAX_PARTICIPANTS} online`
                  : "Conectando..."}
              </p>
            </div>
          </div>

          <div className="min-w-0 md:hidden">
            <p className="truncate text-xs font-black text-white/80">
              {roomCode.toUpperCase()}
            </p>
            <p className="text-[10px] font-bold text-white/30">
              {realtimeConnected
                ? `${participantCount} online`
                : "Conectando..."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <div className="hidden rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/35 xl:block">
            A4 horizontal • 3508 × 2480 • 300 DPI
          </div>

          <button
            type="button"
            title="Baixar desenho em PNG"
            onClick={handleDownload}
            className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs font-bold text-white/60 transition hover:border-[#ff1152]/30 hover:bg-[#ff1152]/10 hover:text-white md:px-3"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Baixar</span>
          </button>

          <div className="hidden items-center sm:flex">
            {participants
              .slice(0, MAX_PARTICIPANTS)
              .map((participant, index) => (
                <div
                  key={participant.userId}
                  title={
                    participant.userId === userId
                      ? `${participant.name} (você)`
                      : participant.name
                  }
                  className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#0d0d12] bg-[#ff1152] text-xs font-black ${
                    index > 0 ? "-ml-2" : ""
                  }`}
                >
                  {participant.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt={participant.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getParticipantInitial(participant.name)
                  )}

                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d0d12] bg-emerald-400" />
                </div>
              ))}
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1.5 pr-3 md:flex">
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

            <span className="hidden text-sm font-bold text-white/70 lg:block">
              {userName}
            </span>
          </div>

          <Link
            href="/"
            title="Sair da sala"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} />
          </Link>
        </div>
      </header>

      <div
        className={`${
          touchInterface ? "hidden" : "flex"
        } h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#101015] px-4`}
      >
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

          <button
            type="button"
            title="Desfazer (Ctrl+Z)"
            onClick={handleUndo}
            disabled={mounted ? undoAvailable === 0 : false}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent"
          >
            <Undo2 size={20} />
          </button>

          <div className="mx-2 h-7 w-px bg-white/10" />

          {tool === "brush" && (
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent"
            />
          )}

          <span className="text-xs font-bold text-white/40">
            {tool === "brush" ? "Pincel" : "Borracha"}
          </span>

          <input
            type="range"
            min="1"
            max={tool === "brush" ? 100 : 200}
            value={currentSize}
            onChange={(event) =>
              handleSizeChange(Number(event.target.value))
            }
            className="w-36 accent-[#ff1152]"
          />

          <div className="flex h-8 min-w-16 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-bold">
            {currentSize}px
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-white/25">
            Undo {undoAvailable}/{MAX_UNDO_STEPS}
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/50">
            {Math.round(zoom)}%
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          ref={workspaceRef}
          onPointerDown={handleWorkspacePointerDown}
          onPointerMove={handleWorkspacePointerMove}
          onPointerUp={handleWorkspacePointerUp}
          onPointerCancel={handleWorkspacePointerUp}
          onAuxClick={(event) => {
            if (event.button === 1) {
              event.preventDefault();
            }
          }}
          className={`relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-[#19191f] ${
            isPanning ? "cursor-grabbing" : ""
          }`}
          style={{
            touchAction: "none",
            overscrollBehavior: "none",
          }}
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
            className="relative shrink-0 bg-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
            style={{
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
              transformOrigin: "center center",
            }}
          >
            {layers.map((layer) => (
              <canvas
                key={layer.id}
                data-layer-id={layer.id}
                width={PREVIEW_WIDTH}
                height={PREVIEW_HEIGHT}
                onPointerEnter={handleCanvasPointerEnter}
                onPointerLeave={handleCanvasPointerLeave}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                className={`absolute inset-0 block touch-none ${
                  layer.visible ? "" : "invisible"
                } ${
                  layer.id === activeLayerId
                    ? "cursor-none"
                    : "pointer-events-none"
                }`}
                style={{
                  width: PAGE_WIDTH,
                  height: PAGE_HEIGHT,
                  opacity: layer.opacity / 100,
                  touchAction: "none",
                }}
              />
            ))}

            <div
              ref={localCursorElementRef}
              className="pointer-events-none absolute left-0 top-0 z-50 hidden rounded-full border-2 border-solid shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
              style={{
                willChange: "transform",
              }}
            >
              <div
                ref={localCursorLabelRef}
                className="absolute left-full top-full whitespace-nowrap rounded-lg border bg-[#0d0d12] px-3 py-1.5 text-base font-black leading-none text-white shadow-lg"
              >
                {userName}
              </div>
            </div>

            {participants
              .filter((participant) => participant.userId !== userId)
              .map((participant) => (
                <div
                  key={`cursor-${participant.userId}`}
                  ref={(element) =>
                    registerRemoteCursorElement(
                      participant.userId,
                      element,
                    )
                  }
                  className="pointer-events-none absolute left-0 top-0 z-50 hidden rounded-full border-2 border-solid shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
                  style={{
                    willChange: "transform",
                  }}
                >
                  <div
                    ref={(element) =>
                      registerRemoteCursorLabel(
                        participant.userId,
                        element,
                      )
                    }
                    className="absolute left-full top-full whitespace-nowrap rounded-lg border bg-[#0d0d12] px-3 py-1.5 text-base font-black leading-none text-white shadow-lg"
                  >
                    {participant.name}
                  </div>
                </div>
              ))}
          </div>

          <div
            className={`${
              touchInterface ? "block" : "hidden"
            } pointer-events-none absolute left-3 top-3 rounded-xl border border-white/[0.08] bg-[#0d0d12]/85 px-3 py-2 text-[11px] font-bold text-white/45 backdrop-blur`}
          >
            1 dedo: desenhar • 2 dedos: mover/zoom
          </div>

          <div
            className={`${
              touchInterface ? "hidden" : "flex"
            } pointer-events-none absolute bottom-4 left-4 items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0d0d12]/90 px-4 py-2 text-xs font-bold text-white/40 backdrop-blur`}
          >
            <span>Scroll: zoom</span>
            <span className="text-white/15">•</span>
            <span>Botão do meio: mover</span>
            <span className="text-white/15">•</span>
            <span>Ctrl+Z: desfazer</span>
          </div>

          <div
            className={`${
              touchInterface ? "block" : "hidden"
            } pointer-events-none absolute right-3 top-3 rounded-xl border border-white/[0.08] bg-[#0d0d12]/85 px-3 py-2 text-[11px] font-black text-white/45 backdrop-blur`}
          >
            {Math.round(zoom)}%
          </div>
        </div>

        <aside
          className={`${
            touchInterface ? "hidden" : "flex"
          } w-72 shrink-0 flex-col border-l border-white/[0.07] bg-[#0d0d12]`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] px-4">
            <div className="flex items-center gap-2">
              <Layers size={17} className="text-[#ff1152]" />
              <span className="text-sm font-black">Camadas</span>
            </div>

            <button
              type="button"
              title="Adicionar camada"
              onClick={addLayer}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-[#ff1152]/10 hover:text-[#ff1152]"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            {renderLayerItems(false)}
          </div>

          <div className="border-t border-white/[0.07] px-4 py-3">
            <p className="text-[11px] font-medium text-white/25">
              {layers.length} {layers.length === 1 ? "camada" : "camadas"}
            </p>
          </div>
        </aside>
      </div>

      <div
        className={`${
          touchInterface ? "block" : "hidden"
        } shrink-0 border-t border-white/[0.08] bg-[#0d0d12] pb-[env(safe-area-inset-bottom)]`}
      >
        <div className="flex items-center gap-2 px-3 pt-2">
          <button
            type="button"
            aria-label="Pincel"
            onClick={() => setTool("brush")}
            className={`flex h-11 flex-1 items-center justify-center rounded-xl transition ${
              tool === "brush"
                ? "bg-[#ff1152] text-white"
                : "bg-white/[0.04] text-white/45"
            }`}
          >
            <Brush size={21} />
          </button>

          <button
            type="button"
            aria-label="Borracha"
            onClick={() => setTool("eraser")}
            className={`flex h-11 flex-1 items-center justify-center rounded-xl transition ${
              tool === "eraser"
                ? "bg-[#ff1152] text-white"
                : "bg-white/[0.04] text-white/45"
            }`}
          >
            <Eraser size={21} />
          </button>

          <button
            type="button"
            aria-label="Desfazer"
            onClick={handleUndo}
            disabled={mounted ? undoAvailable === 0 : false}
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-white/[0.04] text-white/45 disabled:opacity-20"
          >
            <Undo2 size={21} />
          </button>

          {tool === "brush" && (
            <label className="relative flex h-11 flex-1 items-center justify-center rounded-xl bg-white/[0.04]">
              <span
                className="h-6 w-6 rounded-full border-2 border-white/70"
                style={{ background: color }}
              />
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Cor do pincel"
              />
            </label>
          )}

          <button
            type="button"
            aria-label="Camadas"
            onClick={() => setMobileLayersOpen(true)}
            className="relative flex h-11 flex-1 items-center justify-center rounded-xl bg-white/[0.04] text-white/55"
          >
            <Layers size={21} />
            <span className="absolute right-1.5 top-1 rounded-full bg-[#ff1152] px-1.5 text-[9px] font-black text-white">
              {layers.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 px-3 py-2">
          <span className="w-14 shrink-0 text-xs font-black text-white/50">
            {tool === "brush" ? "Pincel" : "Borracha"}
          </span>

          <input
            type="range"
            min="1"
            max={tool === "brush" ? 100 : 200}
            value={currentSize}
            onChange={(event) =>
              handleSizeChange(Number(event.target.value))
            }
            className="min-w-0 flex-1 accent-[#ff1152]"
          />

          <span className="w-12 shrink-0 text-right text-xs font-black text-white/60">
            {currentSize}px
          </span>
        </div>
      </div>

      {touchInterface && mobileLayersOpen && (
        <div className="absolute inset-0 z-[100]">
          <button
            type="button"
            aria-label="Fechar camadas"
            onClick={() => setMobileLayersOpen(false)}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />

          <section className="absolute inset-x-0 bottom-0 flex max-h-[75dvh] flex-col rounded-t-3xl border-t border-white/10 bg-[#0d0d12] pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_80px_rgba(0,0,0,0.5)]">
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-white/15" />

            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] px-4">
              <div>
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-[#ff1152]" />
                  <span className="text-base font-black">Camadas</span>
                </div>
                <p className="mt-0.5 text-[10px] font-bold text-white/30">
                  {layers.length} {layers.length === 1 ? "camada" : "camadas"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Adicionar camada"
                  onClick={addLayer}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff1152]/10 text-[#ff1152]"
                >
                  <Plus size={20} />
                </button>

                <button
                  type="button"
                  title="Fechar"
                  onClick={() => setMobileLayersOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-white/50"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3">
              {renderLayerItems(true)}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
