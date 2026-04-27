/**
 * Seva AI — Hungarian Algorithm (Kuhn-Munkres)
 * Efficient bipartite matching for volunteer-task assignment.
 * Complexity: O(N^3)
 */

function hungarian(C) {
  const n = C.length;
  if (n === 0) return [];
  const m = C[0].length;
  const size = Math.max(n, m);

  // Pad to square with large sentinel
  const mat = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i < n && j < m ? C[i][j] : 1e9))
  );

  const u = new Array(size + 1).fill(0);
  const v = new Array(size + 1).fill(0);
  const p = new Array(size + 1).fill(0);
  const way = new Array(size + 1).fill(0);

  for (let i = 1; i <= size; i++) {
    p[0] = i;
    let j0 = 0;
    const minVal = new Array(size + 1).fill(Infinity);
    const used = new Array(size + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = -1;

      for (let j = 1; j <= size; j++) {
        if (!used[j]) {
          const cur = mat[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minVal[j]) { minVal[j] = cur; way[j] = j0; }
          if (minVal[j] < delta) { delta = minVal[j]; j1 = j; }
        }
      }

      for (let j = 0; j <= size; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else { minVal[j] -= delta; }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    let j1;
    do {
      j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }

  const assignment = new Array(n).fill(-1);
  for (let j = 1; j <= size; j++) {
    if (p[j] >= 1 && p[j] <= n && j <= m) assignment[p[j] - 1] = j - 1;
  }
  return assignment;
}

module.exports = { hungarian };
