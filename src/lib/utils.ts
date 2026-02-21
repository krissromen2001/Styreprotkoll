import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

export function formatDateISO(dateStr: string): string {
  // Convert from DD.MM.YYYY to YYYY-MM-DD
  if (dateStr.includes(".")) {
    const [day, month, year] = dateStr.split(".");
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

export function formatDateTime(dateStr: string, timeStr: string): string {
  return `${formatDate(dateStr)} kl ${timeStr}`;
}

export function getYearSuffix(dateStr: string): string {
  if (!dateStr) return String(new Date().getFullYear()).slice(-2);
  const [year] = dateStr.split("-");
  if (!year || year.length < 4) return String(new Date().getFullYear()).slice(-2);
  return year.slice(-2);
}

export function formatAgendaNumber(sortOrder: number, dateStr: string): string {
  return `${sortOrder}.${getYearSuffix(dateStr)}`;
}
