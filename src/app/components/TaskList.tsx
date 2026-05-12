import { AnimatePresence } from "motion/react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { Task, AccentColor } from "../types";
import { useStore } from "../store/useStore";
import { TaskRow } from "./TaskRow";

interface Props {
  tasks: Task[];
  accent: AccentColor;
  groupId: string;
}

export const TaskList = ({ tasks, accent, groupId }: Props) => {
  const reorderTasks = useStore((s) => s.reorderTasks);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(tasks, oldIndex, newIndex);
    reorderTasks(
      groupId,
      next.map((t) => t.id),
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col divide-y divide-border/60">
          <AnimatePresence initial={false}>
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} accent={accent} />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </DndContext>
  );
};
