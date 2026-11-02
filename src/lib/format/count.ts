/** A whole count with Indian digit grouping: 1,24,500 (the same grouping the money uses). */
export const formatCount = (value: number): string => value.toLocaleString('en-IN');
