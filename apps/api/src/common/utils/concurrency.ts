export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing = new Set<Promise<void>>();

  for (let index = 0; index < items.length; index++) {
    // Remove `p` from the tracking set only once IT settles (via the closure
    // reference below), not whichever promise happens to be racing when the
    // concurrency gate is checked — removing the wrong one lets Promise.all
    // return before every item has actually written to `results`, leaving holes.
    const p: Promise<void> = fn(items[index], index).then((result) => {
      results[index] = result;
      executing.delete(p);
    });
    executing.add(p);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
