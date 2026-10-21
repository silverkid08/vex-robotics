// Challenge catalogue for Challenge mode (simulator only).
//
// Each challenge is a small board of squares; one square = one robot step (150 mm).
// Legend (see .claude/skills/challenge-design and docs/10-challenge-mode.md):
//   #  wall      .  floor      S  start (faces `dir`, default N)
//   *  star (reach it)         o  coin (drive over it)
//   R G B  paint tile (be on it with the bumper light that colour)
//   r g b  puck (magnet grab / let go)      1 2 3  box for a red / green / blue puck
//   =  gate (closed wall + lamp; `gate` says when it opens: {after: s} | {when:'bump'} | {when:'coins'} | {closeAfter: s})
// `par` = piece count of the most efficient known solution (every par is proven by tests/challenges.test.mjs).
// `hint` is for grown-ups only (the log and the parent guide); the child only sees the board.
// Order = difficulty order = order of the level cards. Ids are stored in progress: never rename, only add.

export const Challenges = [
  {
    id: 'c01', name: 'One step', par: 1,
    grid: [
      '###',
      '#*#',
      '#S#',
      '###',
    ],
    hint: 'Forward 1.',
  },
  {
    id: 'c02', name: 'Three steps', par: 1,
    grid: [
      '###',
      '#*#',
      '#.#',
      '#.#',
      '#S#',
      '###',
    ],
    hint: 'Forward 3 — or forward 1 three times, or a repeat.',
  },
  {
    id: 'c03', name: 'Turn right', par: 3,
    grid: [
      '######',
      '#...*#',
      '#.####',
      '#.####',
      '#S####',
      '######',
    ],
    hint: 'Forward 3, turn right, forward 3.',
  },
  {
    id: 'c04', name: 'Turn left', par: 3,
    grid: [
      '######',
      '#*...#',
      '####.#',
      '####.#',
      '####S#',
      '######',
    ],
    hint: 'Forward 3, turn left, forward 3.',
  },
  {
    id: 'c05', name: 'Backwards', par: 1,
    grid: [
      '###',
      '#S#',
      '#.#',
      '#*#',
      '###',
    ],
    hint: 'Backward 2 — or turn around and forward 2.',
  },
  {
    id: 'c06', name: 'Coins in a row', par: 1, dir: 'E',
    grid: [
      '########',
      '#So.o.*#',
      '########',
    ],
    hint: 'Forward 5 collects both coins on the way to the star.',
  },
  {
    id: 'c07', name: 'Around the block', par: 6,
    grid: [
      '#####',
      '#.*.#',
      '#.#.#',
      '#.S.#',
      '#####',
    ],
    hint: 'Go round either side: turn left, forward 1, turn right, forward 2, turn right, forward 1 (or the mirror).',
  },
  {
    id: 'c08', name: 'Zigzag', par: 5,
    grid: [
      '######',
      '###.*#',
      '##..##',
      '#..###',
      '#S####',
      '######',
    ],
    hint: 'Repeat 3 times: forward 1, turn right, forward 1, turn left — or write out all the steps.',
  },
  {
    id: 'c09', name: 'Light it red', par: 2,
    grid: [
      '###',
      '#R#',
      '#.#',
      '#S#',
      '###',
    ],
    hint: 'Light red, forward 2 (or forward 2, then light red while standing on the tile).',
  },
  {
    id: 'c10', name: 'Two colours', par: 4,
    grid: [
      '###',
      '#G#',
      '#R#',
      '#S#',
      '###',
    ],
    hint: 'Light red, forward 1, light green, forward 1.',
  },
  {
    id: 'c11', name: 'Knock knock', par: 2, gate: { when: 'bump' },
    grid: [
      '###',
      '#*#',
      '#.#',
      '#=#',
      '#.#',
      '#S#',
      '###',
    ],
    hint: 'The door opens when the bumper is pressed: wait for a bump (tap the toy bumper), forward 4 — or drive into the door to knock, then forward 3.',
  },
  {
    id: 'c12', name: 'Red light, green light', par: 2, gate: { after: 2 },
    grid: [
      '###',
      '#*#',
      '#.#',
      '#=#',
      '#.#',
      '#S#',
      '###',
    ],
    hint: 'The lamp turns green after 2 seconds: wait 3, forward 4 — or forward 1, wait to see green, forward 3.',
  },
  {
    id: 'c13', name: 'Deliver the puck', par: 3,
    grid: [
      '###',
      '#1#',
      '#.#',
      '#r#',
      '#S#',
      '###',
    ],
    hint: 'Magnet grab (the puck is right in front), forward 2, magnet let go — or drive onto the puck first.',
  },
  {
    id: 'c14', name: 'Coin corners', par: 3,
    grid: [
      '#####',
      '#o.o#',
      '#.#.#',
      '#S.o#',
      '#####',
    ],
    hint: 'Repeat 3 times: forward 2, turn right.',
  },
  {
    id: 'c15', name: 'Maze one', par: 7,
    grid: [
      '#######',
      '#*..#.#',
      '###.#.#',
      '#...#.#',
      '#.###.#',
      '#S....#',
      '#######',
    ],
    hint: 'Forward 2, right, forward 2, left, forward 2, left, forward 2. The corridor on the right is a dead end.',
  },
  {
    id: 'c16', name: 'Two pucks', par: 12,
    grid: [
      '#####',
      '#1.2#',
      '#...#',
      '#r.g#',
      '#.S.#',
      '#####',
    ],
    hint: 'Left, forward 1, right, grab, forward 2, let go (red done); right, forward 2, right, grab, turn around, let go.',
  },
  {
    id: 'c17', name: 'Paint the corners', par: 7,
    grid: [
      '#####',
      '#R.G#',
      '#.#.#',
      '#S.*#',
      '#####',
    ],
    hint: 'Light red, forward 2, right, light green, forward 2, right, forward 2.',
  },
  {
    id: 'c18', name: 'Coins open the door', par: 5, gate: { when: 'coins' },
    grid: [
      '#######',
      '#o...o#',
      '#.###.#',
      '#S.=.*#',
      '#######',
    ],
    hint: 'The door opens once every coin is collected: forward 2, right, forward 4, right, forward 2.',
  },
  {
    id: 'c19', name: 'Quick!', par: 2, dir: 'E', gate: { closeAfter: 2.8 },
    grid: [
      '########',
      '#S.=..*#',
      '########',
    ],
    hint: 'The door closes after a moment: speed 5, forward 5. At normal speed the robot does not make it through.',
  },
  {
    id: 'c20', name: 'Spiral', par: 7,
    grid: [
      '#######',
      '#.....#',
      '#.###.#',
      '#.#*..#',
      '#.#####',
      '#S#####',
      '#######',
    ],
    hint: 'Forward 4, right, forward 4, right, forward 2, right, forward 2.',
  },
  {
    id: 'c21', name: 'Big maze', par: 11, dir: 'E',
    grid: [
      '#########',
      '#...#...#',
      '#.#.#.#.#',
      '#.#...#*#',
      '#.#.#.#.#',
      '#S..#...#',
      '#########',
    ],
    hint: 'Two routes. Short: forward 2, left, forward 2, right, forward 2, right, forward 2, left, forward 2, left, forward 2. Long: up the left side and along the top.',
  },
  {
    id: 'c22', name: 'Deliver through the maze', par: 7, dir: 'E',
    grid: [
      '#######',
      '#1....#',
      '#.###.#',
      '#S.r..#',
      '#######',
    ],
    hint: 'Forward 1, grab, turn around, forward 1, right, forward 1, let go — or carry it the long way round.',
  },
  {
    id: 'c23', name: 'Treasure hunt', par: 13,
    grid: [
      '#########',
      '#o..#..o#',
      '#.#.#.#.#',
      '#.#.*.#.#',
      '#.#.#.#.#',
      '#S..#..o#',
      '#########',
    ],
    hint: 'Three coins and the star, in any order. One way: up 4, right 2, down 2, left 1 (star), on 1, up 2, right 2, down 4.',
  },
];

export const ChallengeById = Object.fromEntries(Challenges.map((c) => [c.id, c]));

/** Count the pieces in a program (a repeat counts as one plus its children). */
export function countPieces(list) {
  let n = 0;
  for (const p of list || []) { n += 1; if (p.children) n += countPieces(p.children); }
  return n;
}

/** Stars for a winning program: 3 at par or better, 2 within two pieces of par, else 1. */
export function gradeSolution(def, program) {
  const n = countPieces(program?.pieces);
  if (n <= def.par) return 3;
  if (n <= def.par + 2) return 2;
  return 1;
}
