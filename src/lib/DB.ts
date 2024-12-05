import {
  endOfDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { customAlphabet } from "nanoid";
import initSqlJs, { Database } from "sql.js";
import { startOfPeriod } from "./utils";

const DB_KEY = "PLANNER_SQLITE";

export const runSQLite = async (setDb: (db: DB) => void) => {
  // Load the SQLite library
  const SQL = await initSqlJs({
    locateFile: (file) =>
      `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`,
  });

  setDb(new DB(SQL));
};

export class DB {
  db: Database;

  constructor(SQL: initSqlJs.SqlJsStatic) {
    const savedData = localStorage.getItem(DB_KEY);
    if (savedData) {
      const binaryArray = new Uint8Array(JSON.parse(savedData));
      this.db = new SQL.Database(binaryArray);
    } else {
      this.db = new SQL.Database();
      this.db.run(`
       CREATE TABLE task (
         id TEXT UNIQUE,
         name TEXT,
         complete BOOLEAN,
         sortOrder INTEGER DEFAULT 0,
         period TEXT,
         date TEXT);
       `);
    }
  }

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(Array.from(this.db.export())));
  }

  list(day?: Date, period?: Period): Task[] {
    const res =
      !!day && !!period
        ? this.db.exec(
            `SELECT id, name, complete, sortOrder, period, date
           FROM task
           WHERE date >= ? AND date < ?
             AND period = ?
           ORDER BY sortOrder`,
            [startOfDay(day).toISOString(), endOfDay(day).toISOString(), period]
          )
        : !!day
        ? this.db.exec(
            `SELECT id, name, complete, sortOrder, period, date
           FROM task
           WHERE date >= ? AND date < ?
           ORDER BY sortOrder`,
            [startOfDay(day).toISOString(), endOfDay(day).toISOString()]
          )
        : !!period
        ? this.db.exec(
            `SELECT id, name, complete, sortOrder, period, date
           FROM task
           WHERE period = ?
           ORDER BY sortOrder`,
            [period]
          )
        : this.db.exec(
            `SELECT id, name, complete, sortOrder, period, date
           FROM task
           ORDER BY sortOrder`
          );
    if (
      res.length === 0 ||
      res[0].values.length === 0 ||
      res[0].values[0].length < 3
    ) {
      return [];
    } else {
      const tasks = [];
      for (const values of res[0].values) {
        const [id, name, complete, sortOrder, period, date] = values;
        tasks.push({
          id: id?.toString() || "",
          name: name?.toString() || "",
          complete: complete?.valueOf() === 1 || false,
          sortOrder: sortOrder?.valueOf() as number,
          period: period?.toString() as Period,
          date: new Date(date?.toString() || ""),
        });
      }
      return tasks;
    }
  }

  read(id: string): Task | null {
    const res = this.db.exec(
      `SELECT id, name, complete, sortOrder, period, date
       FROM task
       WHERE id = ?`,
      [id]
    );
    if (
      res.length === 0 ||
      res[0].values.length === 0 ||
      res[0].values[0].length < 3
    ) {
      return null;
    } else {
      const [id, name, complete, sortOrder, period, date] = res[0].values[0];
      return {
        id: id?.toString() || "",
        name: name?.toString() || "",
        complete: complete?.valueOf() === 1 || false,
        sortOrder: sortOrder?.valueOf() as number,
        period: period?.toString() as Period,
        date: new Date(date?.toString() || ""),
      };
    }
  }

  checkExists(id: string) {
    const task = this.read(id);
    if (task === null) {
      throw Error("Not Found");
    }
    return task;
  }

  create(name: string, day: Date, period: Period) {
    const id = generateId();
    const tasks = this.list(day);
    const date = startOfPeriod(day, period);

    this.db.run(
      `
    INSERT INTO task (id, name, complete, sortOrder, period, date)
    VALUES (?, ?, ?, ?, ?, ?); 
    `,
      [id, name, 0, tasks.length + 1, period, date.toISOString()]
    );
    this.save();
    return this.read(id);
  }

  update(id: string, name: string) {
    this.checkExists(id);

    this.db.run("UPDATE task SET name = ? WHERE id = ?", [name, id]);
    return this.read(id);
  }

  markComplete(id: string) {
    this.checkExists(id);

    this.db.run("UPDATE task SET complete = ? WHERE id = ?", [1, id]);
    this.save();
    return this.read(id);
  }

  markIncomplete(id: string) {
    this.checkExists(id);

    this.db.run("UPDATE task SET complete = ? WHERE id = ?", [0, id]);
    this.save();
    return this.read(id);
  }

  delete(id: string) {
    const taskToBeDeleted = this.checkExists(id);

    this.db.run(
      `DELETE FROM task
        WHERE id = ?;`,
      [id]
    );

    const tasks = this.list(taskToBeDeleted.date, taskToBeDeleted.period);
    this.updateOrder(
      taskToBeDeleted.date,
      taskToBeDeleted.period,
      tasks.filter(({ id }) => taskToBeDeleted.id !== id).map(({ id }) => id)
    );

    this.save();
  }

  copyIncompletes(day: Date, period: Period) {
    const previous =
      period === "days"
        ? this.list(startOfDay(subDays(day, 1)), period)
        : period === "weeks"
        ? this.list(startOfWeek(subWeeks(day, 1)), period)
        : period === "months"
        ? this.list(startOfMonth(subMonths(day, 1)), period)
        : this.list(startOfYear(subYears(day, 1)), period);
    const incompletes = previous.filter((task) => !task.complete);

    for (const task of incompletes) {
      this.create(task.name, day, period);
    }
    this.save();
  }

  clearPeriod(day: Date, period: Period) {
    this.db.run(
      "DELETE FROM task WHERE date >= ? AND date < ? AND period = ?",
      [startOfDay(day).toISOString(), endOfDay(day).toISOString(), period]
    );
    this.save();
  }

  updateOrder(day: Date, period: Period, orderedIds: string[]) {
    const tasks = this.list(day, period);
    const taskIdsForDay = new Set(tasks.map((task) => task.id));

    orderedIds.forEach((id, index) => {
      if (!taskIdsForDay.has(id)) {
        throw new Error(
          `Task with id ${id} does not exist for the specified day.`
        );
      }

      this.db.run("UPDATE task SET sortOrder = ? WHERE id = ?", [index, id]);
    });

    this.save();
  }
}

const generateId = () => {
  const nanoid = customAlphabet("23456789ABCDEFGHIJKMNPQRSTUVWXYZ", 10);
  return nanoid();
};

export interface Task {
  id: string;
  name: string;
  complete: boolean;
  sortOrder: number;
  period: Period;
  date: Date;
}

export type Period = "days" | "weeks" | "months" | "year";
