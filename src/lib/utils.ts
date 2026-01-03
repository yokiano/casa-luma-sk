import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function toTitleCase(value: string) {
	return value
		.split(/\s+/)
		.filter(Boolean)
		.map((segment) => segment[0]?.toUpperCase() + segment.slice(1).toLowerCase())
		.join(" ");
}

export function cleanName(name: string | undefined): string {
	if (!name) return "";
	return name.replace(/\[.*?\]/g, "").trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
