// Datas ficam em UTC no banco; a tela mostra sempre o horário do local do evento.

export const TIME_ZONES = [
  { id: "America/Sao_Paulo", label: "Brasília" },
  { id: "America/Manaus", label: "Manaus (−1h)" },
  { id: "America/Rio_Branco", label: "Rio Branco (−2h)" },
  { id: "America/Noronha", label: "Fernando de Noronha (+1h)" },
] as const;

export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export function isTimeZone(value: string): boolean {
  return TIME_ZONES.some((zone) => zone.id === value);
}

/** Diferença, em ms, entre o relógio do fuso e o UTC naquele instante. */
function offsetAt(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return wall - Math.floor(instant / 1000) * 1000;
}

/** Converte "2026-11-14T22:00" no relógio do fuso para o instante em UTC. */
export function zonedToUtc(local: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const guess = wall - offsetAt(wall, timeZone);
  return new Date(wall - offsetAt(guess, timeZone));
}

/** O inverso: o instante, no formato de um campo datetime-local, no relógio do fuso. */
export function utcToZonedInput(date: Date, timeZone: string): string {
  return new Date(date.getTime() + offsetAt(date.getTime(), timeZone)).toISOString().slice(0, 16);
}

export function formatDate(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatDateTime(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatDay(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone }).format(date);
}
