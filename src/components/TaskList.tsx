import { AppContext } from "@/App";
import { Checkbox } from "@/components/ui/checkbox";
import { Period, Task } from "@/lib/DB";
import { useContext } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TaskList = ({
  tasks,
  period,
  refresh,
}: {
  tasks: Task[];
  period: Period;
  refresh: () => void;
}) => {
  const { db } = useContext(AppContext);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!!active && !!over) {
      const _tasks = [...tasks];
      const oldIndex = _tasks.findIndex((item) => item.id === active.id);
      const newIndex = _tasks.findIndex((item) => item.id === over.id);

      if (oldIndex !== newIndex) {
        const [task] = _tasks.splice(oldIndex, 1);
        _tasks.splice(newIndex, 0, task);
        db.updateOrder(
          task.date,
          period,
          _tasks.map(({ id }) => id)
        );
        refresh();
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={tasks.map(({ id }) => id)}>
        {tasks.map((task) => (
          <div key={task.id}>
            <TaskItem task={task} refresh={refresh} />
          </div>
        ))}
      </SortableContext>
    </DndContext>
  );
};

const TaskItem = ({ task, refresh }: { task: Task; refresh: () => void }) => {
  const { db } = useContext(AppContext);
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ContextMenu>
        <ContextMenuTrigger className="">
          <div className="flex items-center gap-x-2 cursor-default">
            <Checkbox
              id={task.id}
              checked={task.complete}
              onClick={(e) => e.stopPropagation()} // Stop event from propagating
              onCheckedChange={(val) => {
                if (val) {
                  db.markComplete(task.id);
                } else {
                  db.markIncomplete(task.id);
                }
                refresh();
              }}
            />
            <div
              {...listeners}
              className="leading-none pt-0.5 pb-1 !cursor-default"
            >
              <label className="text-sm leading-none !cursor-default">
                {task.name}
              </label>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              db.delete(task.id);
              refresh();
            }}
            className="text-red-500"
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};

export default TaskList;
