import { describe, expect, it } from 'vitest';
import { getDependentOptions } from './dependent-options.js';

describe('getDependentOptions', () => {
  const dep = {
    dependsOnKey: 'parent',
    optionMap: {
      cat1: [
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
      ],
    },
  };

  it('returns options for known parent value', () => {
    expect(getDependentOptions(dep, 'cat1')).toHaveLength(2);
  });

  it('returns empty for unknown parent value', () => {
    expect(getDependentOptions(dep, 'unknown')).toHaveLength(0);
  });

  it('returns empty when parent is null', () => {
    expect(getDependentOptions(dep, null)).toHaveLength(0);
  });
});
