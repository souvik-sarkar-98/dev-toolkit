import { Page } from '@ssdev-toolkit/nestjs-core';

describe('Page', () => {
  it('stores content, totalSize, pageIndex, pageSize', () => {
    const items = ['a', 'b', 'c'];
    const result = new Page(items, 30, 1, 10);
    expect(result.content).toEqual(items);
    expect(result.totalSize).toBe(30);
    expect(result.pageIndex).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it('works with an empty content array', () => {
    const result = new Page([], 0, 0, 10);
    expect(result.content).toHaveLength(0);
    expect(result.totalSize).toBe(0);
  });

  it('preserves content item types (generic)', () => {
    const items = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
    const result = new Page(items, 100, 0, 20);
    expect(result.content[0].name).toBe('Alice');
  });
});
