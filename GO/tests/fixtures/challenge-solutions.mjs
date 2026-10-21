// Known solutions for every challenge, written exactly as a child would build them.
// Each entry: { pieces: [[id, param, children?], ...], press?: ms (tap the toy bumper after this delay) }.
// The first solution of each challenge is the most efficient one and must have exactly `par` pieces.
// A challenge with more than one entry is solvable in more than one way.

const F = (n) => ['forward', n];
const B = (n) => ['backward', n];
const R = (deg = 90) => ['turnRight90', deg];
const L = (deg = 90) => ['turnLeft90', deg];
const AROUND = ['turn180'];
const RED = ['ledRed'], GREEN = ['ledGreen'];
const GRAB = ['magnetOn'], DROP = ['magnetOff'];
const WAIT = (s) => ['wait', s];
const BUMP = ['waitBump'];
const SEE = (c) => ['waitSee', c];
const REPEAT = (n, kids) => ['repeat', n, kids];
const SPEED = (lv) => ['speed', lv];

export const Solutions = {
  c01: [{ pieces: [F(1)] }],
  c02: [{ pieces: [F(3)] }, { pieces: [REPEAT(3, [F(1)])] }],
  c03: [{ pieces: [F(3), R(), F(3)] }],
  c04: [{ pieces: [F(3), L(), F(3)] }],
  c05: [{ pieces: [B(2)] }, { pieces: [AROUND, F(2)] }],
  c06: [{ pieces: [F(5)] }, { pieces: [REPEAT(5, [F(1)])] }],
  c07: [{ pieces: [L(), F(1), R(), F(2), R(), F(1)] }, { pieces: [R(), F(1), L(), F(2), L(), F(1)] }],
  c08: [{ pieces: [REPEAT(3, [F(1), R(), F(1), L()])] }, { pieces: [F(1), R(), F(1), L(), F(1), R(), F(1), L(), F(1), R(), F(1)] }],
  c09: [{ pieces: [RED, F(2)] }, { pieces: [F(2), RED] }],
  c10: [{ pieces: [RED, F(1), GREEN, F(1)] }],
  c11: [{ pieces: [BUMP, F(4)], press: 400 }, { pieces: [F(5), F(3)] }],
  c12: [{ pieces: [WAIT(3), F(4)] }, { pieces: [F(1), SEE('green'), F(3)] }],
  c13: [{ pieces: [GRAB, F(2), DROP] }, { pieces: [F(1), GRAB, F(1), DROP] }],
  c14: [{ pieces: [REPEAT(3, [F(2), R()])] }, { pieces: [F(2), R(), F(2), R(), F(2)] }],
  c15: [{ pieces: [F(2), R(), F(2), L(), F(2), L(), F(2)] }],
  c16: [{ pieces: [L(), F(1), R(), GRAB, F(2), DROP, R(), F(2), R(), GRAB, AROUND, DROP] }],
  c17: [{ pieces: [RED, F(2), R(), GREEN, F(2), R(), F(2)] }],
  c18: [{ pieces: [F(2), R(), F(4), R(), F(2)] }],
  c19: [{ pieces: [SPEED(5), F(5)] }],
  c20: [{ pieces: [F(4), R(), F(4), R(), F(2), R(), F(2)] }],
  c21: [
    { pieces: [F(2), L(), F(2), R(), F(2), R(), F(2), L(), F(2), L(), F(2)] },
    { pieces: [L(), F(4), R(), F(2), R(), F(2), L(), F(2), L(), F(2), R(), F(2), R(), F(2)] },
  ],
  c22: [{ pieces: [F(1), GRAB, AROUND, F(1), R(), F(1), DROP] }, { pieces: [F(1), GRAB, F(3), L(), F(2), L(), F(3), DROP] }],
  c23: [
    { pieces: [F(4), R(), F(2), R(), F(2), L(), F(2), L(), F(2), R(), F(2), R(), F(4)] },
    { pieces: [R(), F(2), L(), F(2), R(), F(2), L(), F(2), R(), F(2), R(), F(4), AROUND, F(4), L(), F(2), L(), F(2), R(), F(2), R(), F(2), L(), F(2)] },
  ],
};
