/**
 * Thin cn() utility.
 * Uses a lightweight class joiner for now.
 */

// import { clsx, type ClassValue } from "clsx";
// import { twMerge } from "tailwind-merge";
// export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

/** Temporary passthrough until clsx/tw-merge are installed. */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
