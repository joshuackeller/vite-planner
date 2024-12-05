import { AppContext } from "@/App";
import { DB, Period, Task } from "@/lib/DB";
import { cn, isSamePeriod, startOfPeriod } from "@/lib/utils";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarWeeks,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { useContext, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckIcon,
  CornerDownRightIcon,
  EllipsisVerticalIcon,
  XIcon,
} from "lucide-react";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateModal from "./CreateModal";
import TaskList from "./TaskList";

const DatesWithTasksList = ({ day, period }: { day: Date; period: Period }) => {
  const { db } = useContext(AppContext);

  const todayRef = useRef<HTMLDivElement>(null);

  const [createDay, setCreateDay] = useState<Date | null>(null);

  const [datesWithTasks, setDatesWithTasks] = useState<DateWithTasks[]>(
    BuildDatesWithTasks(day, period, db)
  );
  const refresh = () => setDatesWithTasks(BuildDatesWithTasks(day, period, db));
  useEffect(() => {
    refresh();
    setTimeout(() => {
      if (!isSamePeriod(day, period)) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const id = `${startOfPeriod(day, period).toISOString()}-${period}`;
        const current = document.getElementById(id);
        if (current) {
          const offsetTop = current.offsetTop; // Adjust for 20px space
          window.scrollTo({ top: offsetTop, behavior: "smooth" });
        } else {
        }
      }
    }, 50);
  }, [day, period]);

  return (
    <>
      <CreateModal
        day={createDay}
        setDay={setCreateDay}
        refresh={refresh}
        period={period}
      />
      <div className="p-3">
        <div className="space-y-3">
          {datesWithTasks.map((dateWithTasks) => {
            const samePeriod = isSamePeriod(dateWithTasks.date, period);
            return (
              <div
                key={`${dateWithTasks.date.toISOString()}-${period}`}
                className="rounded-xl bg-white p-4"
                ref={samePeriod ? todayRef : undefined}
                id={`${dateWithTasks.date.toISOString()}-${period}`}
              >
                <div className="flex min-h-64">
                  <div
                    className={cn(
                      "p-3 w-44 rounded-xl flex flex-col justify-between",
                      samePeriod ? "bg-indigo-100" : "bg-zinc-100"
                    )}
                  >
                    <div className="flex justify-between">
                      <div>
                        <h6>{DateTitle(dateWithTasks.date, period)}</h6>
                        {period === "days" && (
                          <h6
                            className={cn(
                              "-mt-2",
                              samePeriod ? "text-indigo-700" : "text-zinc-400"
                            )}
                          >
                            {format(dateWithTasks.date, "EEE")}
                          </h6>
                        )}
                      </div>
                      <div className="mt-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <EllipsisVerticalIcon className="size-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => setCreateDay(dateWithTasks.date)}
                            >
                              <CheckIcon />
                              Add Task
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                db.copyIncompletes(dateWithTasks.date, period);
                                refresh();
                              }}
                            >
                              <CornerDownRightIcon />
                              Copy Previous Incomplete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="!text-red-500"
                              onClick={() => {
                                db.clearPeriod(dateWithTasks.date, period);
                                refresh();
                              }}
                            >
                              <XIcon />
                              Clear All
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-sm",
                          samePeriod ? "text-indigo-700" : "text-zinc-700"
                        )}
                      >
                        {dateWithTasks.tasks.reduce(
                          (total, task) => total + (task.complete ? 1 : 0),
                          0
                        )}{" "}
                        / {dateWithTasks.tasks.length}
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 px-3 space-y-8 flex flex-col justify-between">
                    <div>
                      <TaskList
                        tasks={dateWithTasks.tasks}
                        refresh={refresh}
                        period={period}
                      />
                    </div>
                    <div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setCreateDay(dateWithTasks.date)}
                      >
                        <CheckIcon />
                        Add Task
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-[calc(100vh-310px)]" />
      </div>
    </>
  );
};

export default DatesWithTasksList;

type DateWithTasks = { date: Date; tasks: Task[] };

const BuildDatesWithTasks = (
  day: Date,
  period: Period,
  db: DB
): DateWithTasks[] => {
  let dates: Date[] = [];

  if (period === "days") {
    const startOfTheWeek = startOfWeek(day, { weekStartsOn: 0 });
    dates = Array.from({ length: 7 }, (_, i) => addDays(startOfTheWeek, i));
  } else if (period === "weeks") {
    const startMonth = startOfMonth(day);
    const endMonth = endOfMonth(day);
    const numWeeks = differenceInCalendarWeeks(endMonth, startMonth) + 1;
    dates = Array.from({ length: numWeeks }, (_, i) => addWeeks(startMonth, i));
  } else if (period === "months") {
    const startOfYearDate = startOfYear(day);
    dates = Array.from({ length: 12 }, (_, i) => addMonths(startOfYearDate, i));
  } else if (period === "year") {
    dates = [startOfYear(day)];
  }

  return dates.map((date) => ({
    date,
    tasks: db.list(date, period),
  }));
};

const DateTitle = (date: Date, period: Period): string => {
  if (period === "days") {
    return `${format(date, "MMM d")}`;
  } else if (period === "weeks") {
    let end = addDays(date, 6);
    if (!isSameMonth(date, end)) {
      end = endOfMonth(date);
    }
    return `${format(date, "MMM d")} - ${format(end, "MMM d")}`;
  } else if (period === "months") {
    return `${format(date, "MMM yyyy")}`;
  } else if (period === "year") {
    return `${format(date, "yyyy")}`;
  } else {
    return "Invalid Date";
  }
};
