// Inline SVG pictures. Everything a child sees is one of these - no words.
// Each icon is drawn in a 100x100 box so pieces can scale them freely.

const svg = (body, extra = '') => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" ${extra}>${body}</svg>`;

const arrowUp = (color = '#fff') => `<path d="M50 12 L82 48 H64 V86 H36 V48 H18 Z" fill="${color}" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round"/>`;
const arrowDown = (color = '#fff') => `<path d="M50 88 L18 52 H36 V14 H64 V52 H82 Z" fill="${color}" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round"/>`;

// arched arrow: sweep in degrees (90,180,360), direction 1 = clockwise (right)
function arcArrow(sweep, cw = true, color = '#fff') {
  const r = 30, cx = 50, cy = 54;
  const start = -90; // top
  const end = start + (cw ? sweep : -sweep);
  const rad = (d) => (d * Math.PI) / 180;
  const sx = cx + r * Math.cos(rad(start)), sy = cy + r * Math.sin(rad(start));
  const ex = cx + r * Math.cos(rad(end)), ey = cy + r * Math.sin(rad(end));
  const large = sweep > 180 ? 1 : 0;
  const sweepFlag = cw ? 1 : 0;
  // arrow head tangent at end
  const tangent = rad(end + (cw ? 90 : -90));
  const hx = ex + 16 * Math.cos(tangent), hy = ey + 16 * Math.sin(tangent);
  const nx = Math.cos(rad(end)), ny = Math.sin(rad(end));
  const head = `M${ex + nx * 12} ${ey + ny * 12} L${hx} ${hy} L${ex - nx * 12} ${ey - ny * 12} Z`;
  const full = sweep >= 360;
  const arc = full
    ? `M${sx} ${sy} A${r} ${r} 0 1 ${sweepFlag} ${cx + r * Math.cos(rad(start + (cw ? 300 : -300)))} ${cy + r * Math.sin(rad(start + (cw ? 300 : -300)))}`
    : `M${sx} ${sy} A${r} ${r} 0 ${large} ${sweepFlag} ${ex} ${ey}`;
  const endAngle = full ? start + (cw ? 300 : -300) : end;
  const fex = cx + r * Math.cos(rad(endAngle)), fey = cy + r * Math.sin(rad(endAngle));
  const ft = rad(endAngle + (cw ? 90 : -90));
  const fhx = fex + 18 * Math.cos(ft), fhy = fey + 18 * Math.sin(ft);
  const fnx = Math.cos(rad(endAngle)), fny = Math.sin(rad(endAngle));
  const fhead = `M${fex + fnx * 13} ${fey + fny * 13} L${fhx} ${fhy} L${fex - fnx * 13} ${fey - fny * 13} Z`;
  return `<path d="${arc}" fill="none" stroke="#1a1a1a" stroke-width="14" stroke-linecap="round"/>` +
    `<path d="${arc}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="${full ? fhead : head}" fill="${color}" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round"/>`;
}

const bumper = (led = 'off', pressed = false) => {
  const glow = led === 'red' ? '#ff3b3b' : led === 'green' ? '#39d353' : '#cfcfcf';
  const halo = led === 'off' ? '' : `<circle cx="50" cy="42" r="40" fill="${glow}" opacity="0.35"/>`;
  const top = pressed ? 50 : 40;
  return `${halo}<rect x="18" y="58" width="64" height="22" rx="6" fill="#4a4a4a" stroke="#1a1a1a" stroke-width="4"/>` +
    `<rect x="26" y="${top - 18}" width="48" height="${76 - top}" rx="10" fill="${glow}" stroke="#1a1a1a" stroke-width="4"/>`;
};

const magnet = (on = true) => `
  <path d="M30 20 V55 a20 20 0 0 0 40 0 V20" fill="none" stroke="#d9363e" stroke-width="16" stroke-linecap="butt"/>
  <path d="M30 20 V38 M70 20 V38" stroke="#e8e8e8" stroke-width="16"/>
  <path d="M30 20 V55 a20 20 0 0 0 40 0 V20" fill="none" stroke="#1a1a1a" stroke-width="4"/>
  ${on ? '<path d="M22 86 L30 72 M50 92 L50 78 M78 86 L70 72" stroke="#ffb800" stroke-width="6" stroke-linecap="round"/>' :
    '<rect x="36" y="80" width="28" height="12" rx="3" fill="#8a8a8a" stroke="#1a1a1a" stroke-width="3"/>'}`;

const eye = (color = '#8a8a8a', object = false) => `
  <ellipse cx="50" cy="50" rx="44" ry="28" fill="#fff" stroke="#1a1a1a" stroke-width="4"/>
  <circle cx="50" cy="50" r="18" fill="${color}" stroke="#1a1a1a" stroke-width="4"/>
  <circle cx="50" cy="50" r="7" fill="#1a1a1a"/>
  <circle cx="57" cy="43" r="4" fill="#fff"/>
  ${object ? '<rect x="70" y="66" width="24" height="24" rx="4" fill="#c58b4e" stroke="#1a1a1a" stroke-width="3"/>' : ''}`;

const hourglass = (dots = 1) => `
  <path d="M28 12 H72 V28 L54 50 L72 72 V88 H28 V72 L46 50 L28 28 Z" fill="#fff" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round"/>
  <path d="M36 20 H64 L50 40 Z" fill="#ffb800"/>
  <path d="M38 82 H62 L50 64 Z" fill="#ffb800"/>
  ${dotRow(dots, 93)}`;

function dotRow(n, y = 92) {
  if (!n || n === Infinity) return '';
  if (n > 5) return dotRow(5, y - 12) + dotRow(n - 5, y);
  const gap = 15; const start = 50 - ((n - 1) * gap) / 2;
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${start + i * gap}" cy="${y}" r="5.5" fill="#1a1a1a"/>`;
  return s;
}

const loop = (count = 2) => `
  <g transform="translate(50 46) scale(0.8) translate(-50 -54)">${arcArrow(300, true, '#fff')}</g>
  ${count === Infinity ? '<path d="M30 92 c0-10 12-10 20 0 s20 10 20 0 s-12-10-20 0 s-20 10-20 0" fill="none" stroke="#1a1a1a" stroke-width="5"/>' : dotRow(count, 92)}`;

const hand = () => `
  <path d="M38 90 V48 a6 6 0 0 1 12 0 V30 a6 6 0 0 1 12 0 V40 a6 6 0 0 1 12 0 V46 a6 6 0 0 1 12 0 V70 c0 14-10 22-24 22 H54 c-10 0-16-6-22-16 L22 62 a6 6 0 0 1 10-7 L38 62" fill="#ffd9a8" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round"/>`;

const play = () => svg('<circle cx="50" cy="50" r="46" fill="#2ecc40" stroke="#14532d" stroke-width="4"/><path d="M40 28 L74 50 L40 72 Z" fill="#fff"/>');
const stop = () => svg('<circle cx="50" cy="50" r="46" fill="#ff4136" stroke="#7f1d1d" stroke-width="4"/><rect x="32" y="32" width="36" height="36" rx="4" fill="#fff"/>');
const trash = () => svg('<rect x="26" y="30" width="48" height="58" rx="6" fill="#9aa5b1" stroke="#1a1a1a" stroke-width="4"/><rect x="18" y="20" width="64" height="12" rx="4" fill="#6b7785" stroke="#1a1a1a" stroke-width="4"/><rect x="40" y="10" width="20" height="10" rx="3" fill="#6b7785" stroke="#1a1a1a" stroke-width="3"/><path d="M38 42 V76 M50 42 V76 M62 42 V76" stroke="#fff" stroke-width="4"/>');
const flag = () => svg('<path d="M24 92 V12" stroke="#1a1a1a" stroke-width="8" stroke-linecap="round"/><path d="M28 16 H80 L66 34 L80 52 H28 Z" fill="#2ecc40" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round"/>');
const bluetooth = (on = false) => svg(`<circle cx="50" cy="50" r="46" fill="${on ? '#2ecc40' : '#5b6b7b'}" stroke="#1a1a1a" stroke-width="4"/><path d="M34 32 L66 60 L50 76 V24 L66 40 L34 68" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`);
const robotFace = (happy = true) => svg(`<rect x="14" y="20" width="72" height="62" rx="12" fill="#e9eef3" stroke="#1a1a1a" stroke-width="4"/><circle cx="36" cy="46" r="8" fill="#1a1a1a"/><circle cx="64" cy="46" r="8" fill="#1a1a1a"/>${happy ? '<path d="M34 64 q16 14 32 0" fill="none" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/>' : '<path d="M34 68 q16 -12 32 0" fill="none" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/>'}<path d="M50 20 V8" stroke="#1a1a1a" stroke-width="5"/><circle cx="50" cy="8" r="5" fill="#ff4136"/>`);
const toy = () => svg('<rect x="22" y="40" width="56" height="40" rx="8" fill="#ffd166" stroke="#1a1a1a" stroke-width="4"/><circle cx="34" cy="86" r="9" fill="#1a1a1a"/><circle cx="66" cy="86" r="9" fill="#1a1a1a"/><rect x="36" y="22" width="28" height="18" rx="4" fill="#06d6a0" stroke="#1a1a1a" stroke-width="4"/><circle cx="50" cy="14" r="5" fill="#ef476f"/>');
const gamepad = () => svg('<path d="M20 40 h60 a16 16 0 0 1 16 16 l-6 24 a10 10 0 0 1-18 2 l-6-10 h-32 l-6 10 a10 10 0 0 1-18-2 l-6-24 a16 16 0 0 1 16-16 z" fill="#4a4a4a" stroke="#1a1a1a" stroke-width="4"/><circle cx="34" cy="56" r="9" fill="#9aa5b1"/><circle cx="70" cy="50" r="5" fill="#2ecc40"/><circle cx="80" cy="60" r="5" fill="#ff4136"/>');
const ltr = () => svg('<rect x="8" y="36" width="24" height="28" rx="4" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><rect x="38" y="36" width="24" height="28" rx="4" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><path d="M68 50 H92 M82 40 L92 50 L82 60" fill="none" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round"/>');
const ttb = () => svg('<rect x="36" y="8" width="28" height="24" rx="4" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><rect x="36" y="38" width="28" height="24" rx="4" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><path d="M50 68 V92 M40 82 L50 92 L60 82" fill="none" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round"/>');
const battery = (pct = 0) => {
  const w = Math.max(0, Math.min(1, pct / 100)) * 56;
  const color = pct > 50 ? '#2ecc40' : pct > 20 ? '#ffb800' : '#ff4136';
  return svg(`<rect x="12" y="30" width="68" height="40" rx="6" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><rect x="80" y="42" width="10" height="16" rx="2" fill="#1a1a1a"/><rect x="18" y="36" width="${w}" height="28" rx="3" fill="${color}"/>`);
};
const compass = (heading = 0) => svg(`<circle cx="50" cy="50" r="44" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><path d="M50 10 V18 M50 82 V90 M10 50 H18 M82 50 H90" stroke="#1a1a1a" stroke-width="4"/><g transform="rotate(${heading} 50 50)"><path d="M50 16 L60 50 L50 44 L40 50 Z" fill="#ff4136" stroke="#1a1a1a" stroke-width="3"/><path d="M50 84 L40 50 L50 56 L60 50 Z" fill="#9aa5b1" stroke="#1a1a1a" stroke-width="3"/></g><circle cx="50" cy="50" r="5" fill="#1a1a1a"/>`);
const speed = (pct = 0) => {
  const lines = Math.min(3, Math.round(Math.abs(pct) / 30));
  let l = '';
  for (let i = 0; i < lines; i++) l += `<path d="M${18 - i * 6} ${40 + i * 10} h14" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/>`;
  return svg(`${l}<rect x="34" y="34" width="52" height="34" rx="8" fill="#4da3ff" stroke="#1a1a1a" stroke-width="4"/><circle cx="46" cy="74" r="8" fill="#1a1a1a"/><circle cx="74" cy="74" r="8" fill="#1a1a1a"/><rect x="42" y="24" width="20" height="12" rx="3" fill="#e9eef3" stroke="#1a1a1a" stroke-width="3"/>`);
};
const crash = () => svg('<path d="M50 6 L58 38 L90 40 L64 58 L76 90 L50 70 L24 90 L36 58 L10 40 L42 38 Z" fill="#ffb800" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round"/><path d="M54 30 L42 52 H54 L46 72" fill="none" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>');
const star = () => svg('<path d="M50 8 L62 36 L92 38 L68 58 L76 90 L50 72 L24 90 L32 58 L8 38 L38 36 Z" fill="#ffd166" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round"/>');
const heart = () => svg('<path d="M50 88 L18 56 a18 18 0 0 1 32-24 a18 18 0 0 1 32 24 Z" fill="#ef476f" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round"/>');
const rocket = () => svg('<path d="M50 8 c18 14 22 40 14 62 H36 c-8-22-4-48 14-62 Z" fill="#e9eef3" stroke="#1a1a1a" stroke-width="4"/><circle cx="50" cy="40" r="8" fill="#4da3ff" stroke="#1a1a1a" stroke-width="3"/><path d="M36 60 L20 76 H38 Z M64 60 L80 76 H62 Z" fill="#ff4136" stroke="#1a1a1a" stroke-width="3"/><path d="M42 72 h16 l-8 20 z" fill="#ffb800"/>');
const gear = () => svg('<circle cx="50" cy="50" r="18" fill="none" stroke="#1a1a1a" stroke-width="10"/><g stroke="#1a1a1a" stroke-width="10" stroke-linecap="round"><path d="M50 10 V22 M50 78 V90 M10 50 H22 M78 50 H90 M22 22 L30 30 M70 70 L78 78 M22 78 L30 70 M70 30 L78 22"/></g>');
const steer = () => svg('<circle cx="50" cy="50" r="42" fill="none" stroke="#1a1a1a" stroke-width="10"/><circle cx="50" cy="50" r="12" fill="#1a1a1a"/><path d="M50 62 V88 M18 42 L40 48 M82 42 L60 48" stroke="#1a1a1a" stroke-width="8"/>');
const puzzle = () => svg('<path d="M20 30 h20 a10 10 0 0 1 20 0 h20 v20 a10 10 0 0 0 0 20 v20 h-20 a10 10 0 0 1-20 0 h-20 v-20 a10 10 0 0 1 0-20 z" fill="#4da3ff" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round"/>');
const lightOn = () => svg('<circle cx="50" cy="42" r="26" fill="#fff6b0" stroke="#1a1a1a" stroke-width="4"/><rect x="40" y="68" width="20" height="18" rx="3" fill="#9aa5b1" stroke="#1a1a1a" stroke-width="3"/><path d="M50 6 V14 M18 20 L24 26 M82 20 L76 26 M8 44 H16 M84 44 H92" stroke="#ffb800" stroke-width="5" stroke-linecap="round"/>');
const wifi = (ok) => svg(`<path d="M20 44 a42 42 0 0 1 60 0 M30 56 a28 28 0 0 1 40 0 M40 68 a14 14 0 0 1 20 0" fill="none" stroke="${ok ? '#2ecc40' : '#9aa5b1'}" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="82" r="7" fill="${ok ? '#2ecc40' : '#9aa5b1'}"/>`);

export const Icons = {
  // motion
  forward: (n = 1) => svg(`<g transform="translate(0 -3) scale(1 0.92)">${arrowUp('#fff')}</g>` + dotRow(n, 93)),
  backward: (n = 1) => svg(`<g transform="translate(0 -3) scale(1 0.92)">${arrowDown('#fff')}</g>` + dotRow(n, 93)),
  turnRight90: () => svg(arcArrow(90, true)),
  turnLeft90: () => svg(arcArrow(90, false)),
  turnRight: (deg = 90) => svg(arcArrow(Math.min(359, deg), true)),
  turnLeft: (deg = 90) => svg(arcArrow(Math.min(359, deg), false)),
  plus: () => svg('<circle cx="50" cy="50" r="44" fill="#2ecc40" stroke="#1a1a1a" stroke-width="4"/><path d="M50 26 V74 M26 50 H74" stroke="#fff" stroke-width="12" stroke-linecap="round"/>'),
  minus: () => svg('<circle cx="50" cy="50" r="44" fill="#ff9f43" stroke="#1a1a1a" stroke-width="4"/><path d="M26 50 H74" stroke="#fff" stroke-width="12" stroke-linecap="round"/>'),
  sizeSmall: () => svg('<rect x="34" y="34" width="32" height="32" rx="6" fill="#4da3ff" stroke="#1a1a1a" stroke-width="4"/>'),
  sizeMedium: () => svg('<rect x="24" y="24" width="52" height="52" rx="8" fill="#4da3ff" stroke="#1a1a1a" stroke-width="4"/>'),
  sizeLarge: () => svg('<rect x="12" y="12" width="76" height="76" rx="10" fill="#4da3ff" stroke="#1a1a1a" stroke-width="4"/>'),
  layoutList: () => svg('<rect x="30" y="10" width="40" height="22" rx="5" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><rect x="30" y="39" width="40" height="22" rx="5" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><rect x="30" y="68" width="40" height="22" rx="5" fill="#fff" stroke="#1a1a1a" stroke-width="4"/>'),
  layoutGrid: () => svg('<rect x="12" y="12" width="34" height="34" rx="5" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><rect x="54" y="12" width="34" height="34" rx="5" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><rect x="12" y="54" width="34" height="34" rx="5" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><rect x="54" y="54" width="34" height="34" rx="5" fill="#fff" stroke="#1a1a1a" stroke-width="4"/>'),
  layoutTray: () => svg('<rect x="8" y="30" width="24" height="24" rx="5" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><rect x="38" y="30" width="24" height="24" rx="5" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><rect x="68" y="30" width="24" height="24" rx="5" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><path d="M10 70 H90" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round"/>'),
  sortFamily: () => svg('<circle cx="30" cy="34" r="14" fill="#4da3ff" stroke="#1a1a1a" stroke-width="4"/><circle cx="70" cy="34" r="14" fill="#4da3ff" stroke="#1a1a1a" stroke-width="4"/><circle cx="30" cy="70" r="14" fill="#ff9f43" stroke="#1a1a1a" stroke-width="4"/><circle cx="70" cy="70" r="14" fill="#ff9f43" stroke="#1a1a1a" stroke-width="4"/>'),
  sortAz: () => svg('<text x="50" y="68" font-size="54" font-weight="700" text-anchor="middle" font-family="sans-serif" fill="#1a1a1a">Aa</text>'),
  sortRecent: () => svg('<circle cx="50" cy="50" r="40" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><path d="M50 26 V52 L68 62" fill="none" stroke="#1a1a1a" stroke-width="7" stroke-linecap="round"/>'),
  label: (on) => svg(`<rect x="10" y="30" width="80" height="40" rx="8" fill="${on ? '#ffd166' : '#e9eef3'}" stroke="#1a1a1a" stroke-width="4"/><text x="50" y="59" font-size="30" font-weight="700" text-anchor="middle" font-family="sans-serif" fill="#1a1a1a">Abc</text>`),
  book: () => svg('<path d="M14 20 h32 a8 8 0 0 1 8 8 v52 a8 8 0 0 0-8-8 h-32 z" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><path d="M86 20 h-32 a8 8 0 0 0-8 8 v52 a8 8 0 0 1 8-8 h32 z" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><path d="M22 34 h18 M22 46 h18 M60 34 h18 M60 46 h18" stroke="#4da3ff" stroke-width="4" stroke-linecap="round"/>'),
  zoomIn: () => svg('<circle cx="44" cy="44" r="28" fill="#fff" stroke="#1a1a1a" stroke-width="6"/><path d="M66 66 L88 88" stroke="#1a1a1a" stroke-width="10" stroke-linecap="round"/><path d="M44 30 V58 M30 44 H58" stroke="#1a1a1a" stroke-width="7" stroke-linecap="round"/>'),
  zoomOut: () => svg('<circle cx="44" cy="44" r="28" fill="#fff" stroke="#1a1a1a" stroke-width="6"/><path d="M66 66 L88 88" stroke="#1a1a1a" stroke-width="10" stroke-linecap="round"/><path d="M30 44 H58" stroke="#1a1a1a" stroke-width="7" stroke-linecap="round"/>'),
  close: () => svg('<circle cx="50" cy="50" r="44" fill="#ff4136" stroke="#1a1a1a" stroke-width="4"/><path d="M32 32 L68 68 M68 32 L32 68" stroke="#fff" stroke-width="10" stroke-linecap="round"/>'),
  turtle: () => svg('<ellipse cx="50" cy="56" rx="30" ry="20" fill="#2ecc40" stroke="#1a1a1a" stroke-width="4"/><path d="M30 56 h40 M40 40 v32 M60 40 v32" stroke="#1c8d2b" stroke-width="3"/><circle cx="84" cy="56" r="10" fill="#6fd97a" stroke="#1a1a1a" stroke-width="4"/><circle cx="87" cy="53" r="2" fill="#1a1a1a"/><path d="M28 72 l-6 12 M40 76 l-2 12 M60 76 l2 12 M72 72 l6 12" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round"/>'),
  rabbit: () => svg('<ellipse cx="46" cy="64" rx="26" ry="18" fill="#f1e4d0" stroke="#1a1a1a" stroke-width="4"/><circle cx="72" cy="52" r="14" fill="#f1e4d0" stroke="#1a1a1a" stroke-width="4"/><path d="M66 40 l-4 -26 M78 40 l6 -26" stroke="#1a1a1a" stroke-width="9" stroke-linecap="round"/><path d="M66 40 l-4 -26 M78 40 l6 -26" stroke="#f1e4d0" stroke-width="4" stroke-linecap="round"/><circle cx="76" cy="50" r="2.5" fill="#1a1a1a"/><circle cx="20" cy="62" r="6" fill="#fff" stroke="#1a1a1a" stroke-width="3"/><path d="M6 46 h10 M4 56 h8" stroke="#9aa5b1" stroke-width="4" stroke-linecap="round"/>'),
  turn180: () => svg(arcArrow(180, true)),
  turn360: () => svg(arcArrow(360, true)),
  // light / magnet
  ledRed: () => svg(bumper('red')),
  ledGreen: () => svg(bumper('green')),
  ledOff: () => svg(bumper('off')),
  magnetOn: () => svg(magnet(true)),
  magnetOff: () => svg(magnet(false)),
  // waiting / sensing
  wait: (n = 1) => svg(hourglass(n)),
  waitBump: () => svg(bumper('off', true) + `<g transform="translate(30 -8) scale(0.6)">${hand()}</g>`),
  waitSee: (color = 'red') => svg(eye({ red: '#ff4136', green: '#2ecc40', blue: '#4da3ff' }[color] || '#8a8a8a')),
  waitObject: () => svg(eye('#8a8a8a', true)),
  // control
  repeat: (n = 2) => svg(loop(n)),
  // chrome
  play, stop, trash, flag, bluetooth, robotFace, toy, gamepad, ltr, ttb, battery, compass, speed, crash, star, heart, rocket, gear, steer, puzzle, lightOn, wifi,
  bumperLive: (led, pressed) => svg(bumper(led, pressed)),
  eyeLive: (color, object) => svg(eye({ red: '#ff4136', green: '#2ecc40', blue: '#4da3ff' }[color] || '#9aa5b1', object)),
  magnetLive: (on) => svg(magnet(on)),
  arrowUp: () => svg(arrowUp('#fff')),
  arrowDown: () => svg(arrowDown('#fff')),
  arrowLeft: () => svg(`<g transform="rotate(-90 50 50)">${arrowUp('#fff')}</g>`),
  arrowRight: () => svg(`<g transform="rotate(90 50 50)">${arrowUp('#fff')}</g>`),
};
