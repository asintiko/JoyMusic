import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Play, Radio, Timer, Trash2 } from "lucide-react";
import { Button, EmptyState, IconButton, Kbd, QueueItem, cx, formatDuration } from "@joymusic/ui";
import type { RequestItem } from "@joymusic/shared";
import { useT } from "../../i18n";
import { Panel } from "./panel";
import { reorderIds } from "./overlay";
import type { ConsoleController } from "./use-console";

export function handleQueueDragEnd(
  ids: readonly string[],
  event: Pick<DragEndEvent, "active" | "over">,
  onReorder: (order: string[]) => void,
): boolean {
  const { active, over } = event;
  if (!over || active.id === over.id) return false;
  const next = reorderIds(ids, String(active.id), String(over.id));
  if (next.join("|") === ids.join("|")) return false;
  onReorder(next);
  return true;
}

interface RowProps {
  request: RequestItem;
  index: number;
  selected: boolean;
  controller: ConsoleController;
  large: boolean;
}

function SortableQueueRow({ request, index, selected, controller, large }: RowProps) {
  const t = useT();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: request.id });
  return (
    <div
      ref={setNodeRef}
      role="presentation"
      data-queue-id={request.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx("relative", isDragging && "z-10 rounded-md shadow-3 [&>*]:bg-surface-3")}
      onClick={() => controller.selectQueue(request.id)}
    >
      <QueueItem
        request={{ ...request, durationSec: request.track?.durationSec ?? null }}
        variant="dj"
        position={index + 1}
        highlighted={selected}
        votesLabel={t.votes}
        dedicationText={request.dedicatedTo ? t.dedicationFor(request.dedicatedTo) : undefined}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={t.reorder}
            data-drag-handle
            className="focus-ring flex size-7 cursor-grab touch-none items-center justify-center rounded-sm active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </button>
        }
        actions={
          <>
            <IconButton
              label={t.playNow}
              data-action="play"
              icon={<Play aria-hidden="true" className="size-4" />}
              size={large ? "md" : "sm"}
              onClick={(event) => {
                event.stopPropagation();
                controller.play(request.id);
              }}
            />
            <IconButton
              label={t.remove}
              data-action="remove"
              icon={<Trash2 aria-hidden="true" className="size-4" />}
              size={large ? "md" : "sm"}
              onClick={(event) => {
                event.stopPropagation();
                controller.requestDecline(request);
              }}
            />
          </>
        }
      />
    </div>
  );
}

export function QueuePanel({
  controller,
  large,
}: {
  controller: ConsoleController;
  large: boolean;
}) {
  const t = useT();
  const { queue, selectedQueueId } = controller;
  const ids = queue.map((item) => item.id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const totalSec = queue.reduce((sum, item) => sum + (item.track?.durationSec ?? 0), 0);

  return (
    <Panel
      id="queue"
      title={t.queueTitle}
      count={t.tracks(queue.length)}
      action={
        <>
          {totalSec > 0 ? (
            <span className="type-mono inline-flex items-center gap-1.5 text-[12px] text-fg-muted">
              <Timer aria-hidden="true" className="size-3.5" />
              {formatDuration(totalSec)}
            </span>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            data-action="push-to-air"
            disabled={queue.length === 0}
            leftIcon={<Radio aria-hidden="true" className="size-4" />}
            onClick={() => controller.perform({ type: "playNext" })}
          >
            {t.pushToAir}
            <Kbd>Space</Kbd>
          </Button>
        </>
      }
    >
      {queue.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <EmptyState
            size="md"
            illustration="queue"
            title={t.queueEmpty}
            description={t.queueEmptyBody}
          />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => handleQueueDragEnd(ids, event, controller.reorder)}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div
              role="list"
              aria-label={t.queueTitle}
              className="scrollbar-none flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2"
            >
              {queue.map((request, index) => (
                <SortableQueueRow
                  key={request.id}
                  request={request}
                  index={index}
                  selected={request.id === selectedQueueId}
                  controller={controller}
                  large={large}
                />
              ))}
              <div className="mx-1 mt-2 flex h-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong text-[12.5px] font-semibold text-fg-subtle">
                {t.reorderHint}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      )}
    </Panel>
  );
}
