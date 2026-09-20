/**
 * `trackBy` for row editors inside custom stepper steps.
 *
 * Row editors replace edited row objects to keep state immutable, so identity
 * tracking would destroy and rebuild the row being typed into and drop focus.
 * Position is the stable identity for these lists.
 */
export function trackByIndex(index: number): number {
  return index;
}
