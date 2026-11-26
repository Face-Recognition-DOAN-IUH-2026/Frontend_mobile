import { compareVersions, parseVersionSegments } from '../appUpdater';

describe('appUpdater version comparison', () => {
  it('parses 3-segment and 4-segment versions into 4-element tuples', () => {
    expect(parseVersionSegments('1.0.0')).toEqual([1, 0, 0, 0]);
    expect(parseVersionSegments('v1.2.3.4')).toEqual([1, 2, 3, 4]);
    expect(parseVersionSegments('2.1.0-beta')).toEqual([2, 1, 0, 0]);
  });

  it('compares 4-segment versions accurately', () => {
    expect(compareVersions('1.0.0.2', '1.0.0.1')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0.1', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0.0')).toBe(0);
    expect(compareVersions('1.0.0.1', '1.0.1')).toBeLessThan(0);
    expect(compareVersions('1.0.10', '1.0.2')).toBeGreaterThan(0);
  });
});
