import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Period } from "./DB";
import {
  isSameDay,
  isSameMonth,
  isSameWeek,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function startOfPeriod(date: Date, period: Period): Date {
  if (period === "days") {
    return startOfDay(date);
  } else if (period === "weeks") {
    return startOfWeek(date);
  } else if (period === "months") {
    return startOfMonth(date);
  } else if (period === "year") {
    return startOfYear(date);
  } else {
    return date;
  }
}

export const isSamePeriod = (date: Date, period: Period): boolean => {
  if (period === "days") {
    return isSameDay(date, new Date());
  } else if (period === "weeks") {
    return isSameWeek(date, new Date());
  } else if (period === "months") {
    return isSameMonth(date, new Date());
  } else if (period === "year") {
    return isSameYear(date, new Date());
  } else {
    return false;
  }
};
