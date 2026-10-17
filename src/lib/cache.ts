export function lruSet<K, V>(map: Map<K, V>, key: K, value: V, max: number): void {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > max) {
    const first = map.keys().next();
    if (first.done) break;
    map.delete(first.value);
  }
}

export function lruGet<K, V>(map: Map<K, V>, key: K): V | undefined {
  const v = map.get(key);
  if (v === undefined) return undefined;
  map.delete(key);
  map.set(key, v);
  return v;
}
