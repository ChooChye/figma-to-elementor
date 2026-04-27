export function createIdFactory(): () => string {
  const used = new Set<string>();
  return function (): string {
    let id: string;
    do {
      id = Math.random().toString(16).slice(2, 9).padEnd(7, '0');
    } while (used.has(id));
    used.add(id);
    return id;
  };
}
