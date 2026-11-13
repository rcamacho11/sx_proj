// Plate v1 screens. Body of an async function.
// No object spread, no optional chaining, no nullish coalescing.

var family = await h.font('Barlow');
log('UI font', family);
var mono = family;
try {
  await figma.loadFontAsync({ family: 'Roboto Mono', style: 'Regular' });
  mono = 'Roboto Mono';
} catch (e) {
  log('Roboto Mono missing, G-code uses ' + family);
}

await h.page('Plate');
figma.currentPage.backgrounds = [{ type: 'SOLID', color: h.hex('#000000') }];

var CANVAS_W = 996;
var CANVAS_H = 808;
var RAIL_W = 84;
var INSPECTOR_X = 1080;
var INSPECTOR_W = 360;
var SCALE = 5.2;

function track(node, percent) {
  node.letterSpacing = { unit: 'PERCENT', value: percent };
  return node;
}

function label(parent, str, o) {
  var t = h.text(parent, str, o);
  if (o.track) track(t, o.track);
  return t;
}

function emptyFill(node) {
  node.fills = [];
  return node;
}

function hairline(node) {
  node.strokes = [{ type: 'SOLID', color: h.hex('#F0F0FA'), opacity: 0.28 }];
  node.strokeWeight = 1;
  return node;
}

function stageFill(node) {
  node.fills = h.paint('#1C1F24');
  return node;
}

function metalFill(node) {
  node.fills = h.paint('#E6E8ED');
  return node;
}

function plateGeom() {
  var pw = Math.round(120 * SCALE);
  var ph = Math.round(80 * SCALE);
  var px = Math.round((CANVAS_W - pw) / 2) + 8;
  var py = 128;
  return { pw: pw, ph: ph, px: px, py: py };
}

function shopGrid(parent) {
  var g = plateGeom();
  var step = 10 * SCALE;
  var originX = g.px;
  var originY = g.py + g.ph;
  var x = originX;
  while (x - step >= -1) x -= step;
  var guard = 0;
  while (x <= CANVAS_W && guard < 60) {
    var rel = Math.round((x - originX) / step);
    var major = rel % 5 === 0;
    var v = h.frame(parent, { name: 'gv', x: Math.round(x), y: 0, w: 1, h: CANVAS_H });
    v.fills = [{ type: 'SOLID', color: h.hex('#E4E0D4'), opacity: major ? 0.32 : 0.1 }];
    x += step;
    guard++;
  }
  var y = originY;
  while (y + step <= CANVAS_H + step) y += step;
  y -= step;
  guard = 0;
  while (y >= -1 && guard < 60) {
    var relY = Math.round((originY - y) / step);
    var majorH = relY % 5 === 0;
    var hz = h.frame(parent, { name: 'gh', x: 0, y: Math.round(y), w: CANVAS_W, h: 1 });
    hz.fills = [{ type: 'SOLID', color: h.hex('#E4E0D4'), opacity: majorH ? 0.32 : 0.1 }];
    y -= step;
    guard++;
  }
}

// Material Symbols Outlined, weight 200. Paths from the published SVGs.
// select near_me, hole radio_button_unchecked, pocket rectangle,
// slot crop_16_9, send arrow_upward, caret arrow_drop_down, forward arrow_forward,
// draw edit, program code. The material field uses a plate swatch, not a glyph.
var MATERIAL = {
  select: 'M530.08-186.15 433-434.54l-248.39-98.61-1.53-19.16 593.84-226.15-227.69 592.31h-19.15Zm8.77-63.23 185.07-476.08-477.38 183.54L455.92-459l82.93 209.62ZM455.92-459Z',
  hole: 'M480.13-120q-74.44 0-139.79-28.34t-114.48-77.42q-49.13-49.08-77.49-114.37Q120-405.42 120-479.87q0-74.67 28.34-140.41 28.34-65.73 77.42-114.36 49.08-48.63 114.37-76.99Q405.42-840 479.87-840q74.67 0 140.41 28.34 65.73 28.34 114.36 76.92 48.63 48.58 76.99 114.26Q840-554.81 840-480.13q0 74.44-28.34 139.79t-76.92 114.48q-48.58 49.13-114.26 77.49Q554.81-120 480.13-120Zm-.13-30.77q137.38 0 233.31-96.04 95.92-96.04 95.92-233.19 0-137.38-95.92-233.31-95.93-95.92-233.31-95.92-137.15 0-233.19 95.92-96.04 95.93-96.04 233.31 0 137.15 96.04 233.19 96.04 96.04 233.19 96.04Z',
  pocket: 'M120-200v-560h720v560H120Zm30.77-30.77h658.46v-498.46H150.77v498.46Zm0 0v-498.46 498.46Z',
  slot: 'M215.38-320q-23.05 0-39.22-16.16Q160-352.33 160-375.38v-209.24q0-23.05 16.16-39.22Q192.33-640 215.38-640h529.24q23.05 0 39.22 16.16Q800-607.67 800-584.62v209.24q0 23.05-16.16 39.22Q767.67-320 744.62-320H215.38Zm0-30.77h529.24q9.23 0 16.92-7.69 7.69-7.69 7.69-16.92v-209.24q0-9.23-7.69-16.92-7.69-7.69-16.92-7.69H215.38q-9.23 0-16.92 7.69-7.69 7.69-7.69 16.92v209.24q0 9.23 7.69 16.92 7.69 7.69 16.92 7.69Zm-24.61 0v-258.46 258.46Z',
  send: 'M464.62-200v-501.38L222-458.77 200-480l280-280 280 280-22 21.23-242.62-242.61V-200h-30.76Z',
  caret: 'M480-387.69 327.69-539.77h304.62L480-387.69Z',
  forward: 'M701.38-464.62H200v-30.76h501.38L458.77-738 480-760l280 280-280 280-21.23-22 242.61-242.62Z',
  draw: 'M190.77-190.77h37.85l465.07-464.85-37.84-37.84-465.08 464.84v37.85ZM160-160v-81.08l548.85-550.15q4.45-3.25 10.3-5.9 5.85-2.64 12.22-2.64 6.13 0 11.61 2.19 5.48 2.2 10.64 6.35l37.84 37.85q4.39 4.38 6.46 10.31 2.08 5.93 2.08 11.86 0 6.21-2.51 12.18-2.51 5.96-6.03 10.41L241.08-160H160Zm609.77-571.62-37.92-37.15 37.92 37.15Zm-94.5 57.35-19.42-19.19 37.84 37.84-18.42-18.65Z',
  program: 'M320-268.92 107.69-481.23 321.23-694l21.46 22.23-190.54 190.54 190.08 190.08L320-268.92Zm318.77 1.23-21.46-22.23 190.54-190.54-190.08-190.85L640-693.54l212.31 212.31-213.54 213.54Z'
};

function paintVectors(node, color) {
  if (node.type === 'VECTOR') node.fills = h.paint(color);
  if ('children' in node) {
    for (var i = 0; i < node.children.length; i++) paintVectors(node.children[i], color);
  }
}

function materialIcon(parent, key, x, y, size, color) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 -960 960 960"><path d="' + MATERIAL[key] + '"/></svg>';
  var node = figma.createNodeFromSvg(svg);
  node.name = key + '-icon';
  node.fills = [];
  node.x = x;
  node.y = y;
  paintVectors(node, color);
  parent.appendChild(node);
  return node;
}

function toolCell(parent, o) {
  var cell = h.frame(parent, { name: o.name, x: 10, y: o.y, w: 64, h: 72, radius: 4 });
  var ink = o.active ? '#171A20' : (o.dim ? '#5C6370' : '#F0F0FA');
  var keyInk = o.active ? '#5C6370' : (o.dim ? '#393C41' : '#8E939C');
  cell.fills = o.active ? h.paint('#F0F0FA') : [];
  if (o.icon === 'select') materialIcon(cell, 'select', 24, 8, 16, ink);
  if (o.icon === 'hole') materialIcon(cell, 'hole', 24, 8, 16, ink);
  if (o.icon === 'pocket') materialIcon(cell, 'pocket', 24, 8, 16, ink);
  if (o.icon === 'slot') materialIcon(cell, 'slot', 24, 8, 16, ink);
  var name = label(cell, o.name, { x: 0, y: 36, size: 9, color: ink, align: 'CENTER', width: 64, track: 6 });
  name.y = 34;
  var key = label(cell, o.key, { x: 0, y: 50, size: 9, color: keyInk, align: 'CENTER', width: 64, track: 6 });
  key.y = 50;
  return cell;
}

function shell(board, mode, o) {
  if (!o) o = {};
  var header = h.frame(board, { name: 'header', x: 0, y: 0, w: 1440, h: 56, fill: '#171A20' });
  h.frame(header, { name: 'header-line', x: 0, y: 55, w: 1440, h: 1, fill: '#393C41' });
  label(header, 'PLATE', { x: 20, y: 20, size: 13, weight: 'Medium', color: '#F0F0FA', track: 12 });
  var partChip = h.frame(header, { name: 'part', x: 86, y: 14, w: 128, h: 28, fill: '#000000', radius: 4 });
  var partLabel = label(partChip, 'PLATE-001', { x: 0, y: 7, size: 12, color: '#F0F0FA', align: 'CENTER', width: 128, track: 4 });
  partLabel.y = 7;

  var seg = h.frame(header, { name: 'modes', x: 594, y: 12, w: 252, h: 32, fill: '#000000', radius: 4 });
  var drawOn = mode === 'draw';
  modeTab(seg, { name: 'draw-tab', x: 2, icon: 'draw', label: 'DRAW', on: drawOn });
  modeTab(seg, { name: 'program-tab', x: 126, icon: 'program', label: 'PROGRAM', on: !drawOn });

  var unit = h.frame(header, { name: 'units', x: 1188, y: 14, w: 52, h: 28, fill: '#000000', radius: 4 });
  var unitLabel = label(unit, 'MM', { x: 0, y: 7, size: 11, color: '#F0F0FA', align: 'CENTER', width: 52, track: 8 });
  unitLabel.y = 7;
  label(header, o.save || 'SAVED', { x: 1256, y: 20, size: 11, color: o.saveColor || '#8E939C', track: 8 });

  var rail = h.frame(board, { name: 'rail', x: 0, y: 56, w: RAIL_W, h: CANVAS_H, fill: '#171A20' });
  h.frame(rail, { name: 'rail-line', x: RAIL_W - 1, y: 0, w: 1, h: CANVAS_H, fill: '#393C41' });
  var tools = [
    { name: 'SELECT', key: 'V', icon: 'select', y: 12 },
    { name: 'HOLE', key: 'H', icon: 'hole', y: 92 },
    { name: 'POCKET', key: 'P', icon: 'pocket', y: 172 },
    { name: 'SLOT', key: 'S', icon: 'slot', y: 252 }
  ];
  for (var i = 0; i < tools.length; i++) {
    tools[i].active = !o.readOnly && tools[i].name === 'SELECT';
    tools[i].dim = !!o.readOnly;
    toolCell(rail, tools[i]);
  }

  var status = h.frame(board, { name: 'status', x: 0, y: 864, w: 1440, h: 36, fill: '#171A20' });
  h.frame(status, { name: 'status-line', x: 0, y: 0, w: 1440, h: 1, fill: '#393C41' });
  return { header: header, rail: rail, status: status };
}

function modeTab(seg, o) {
  var tab = h.frame(seg, { name: o.name, x: o.x, y: 2, w: 124, h: 28, radius: 4 });
  tab.fills = o.on ? h.paint('#2A2F3A') : [];
  var ink = o.on ? '#FFFFFF' : '#8E939C';
  var icon = materialIcon(tab, o.icon, 0, 7, 14, ink);
  var text = label(tab, o.label, { x: 0, y: 8, size: 11, color: ink, track: 8 });
  text.y = 8;
  var gap = 6;
  var group = icon.width + gap + text.width;
  var start = Math.round((124 - group) / 2);
  if (start < 8) start = 8;
  icon.x = start;
  text.x = start + Math.round(icon.width) + gap;
  return tab;
}

function field(parent, o) {
  label(parent, o.label, { x: o.x, y: o.y, size: 10, color: '#8E939C', track: 8 });
  var box = h.frame(parent, {
    name: o.label,
    x: o.x,
    y: o.y + 18,
    w: o.w,
    h: 36,
    fill: '#000000',
    stroke: o.bad ? '#E82127' : '#6B7280',
    radius: 4
  });
  var textX = 12;
  if (o.swatch) {
    h.frame(box, { name: 'swatch', x: 10, y: 10, w: 16, h: 16, radius: 3, fill: o.swatch, stroke: '#C5C9D1' });
    textX = 34;
  }
  h.text(box, o.value, { x: textX, y: 8, size: 15, color: o.bad ? '#FF5A5F' : '#F0F0FA' });
  if (o.suffix) {
    label(box, o.suffix, { x: o.w - 36, y: 11, size: 10, color: '#8E939C', track: 6 });
  }
  if (o.menu) {
    materialIcon(box, 'caret', o.w - 26, 10, 16, '#8E939C');
  }
  return box;
}

function sectionTitle(parent, text, y) {
  label(parent, text, { x: 24, y: y, size: 11, color: '#8E939C', track: 10 });
  h.frame(parent, { name: 'section-rule', x: 24, y: y + 22, w: INSPECTOR_W - 48, h: 1, fill: '#393C41' });
}

function promptRow(parent, o) {
  var row = h.frame(parent, { name: o.kicker, x: 24, y: o.y, w: INSPECTOR_W - 48, h: 58, fill: '#000000', stroke: '#6B7280', radius: 4 });
  label(row, o.kicker, { x: 14, y: 10, size: 10, color: '#8E939C', track: 8 });
  h.text(row, o.title, { x: 14, y: 28, size: 13, color: '#F0F0FA', width: 250 });
  materialIcon(row, 'forward', 284, 21, 16, '#CCCCCC');
  return row;
}

function composer(parent, y, placeholder, off) {
  var box = h.frame(parent, { name: 'composer', x: 24, y: y, w: INSPECTOR_W - 48, h: 48, fill: '#000000', stroke: off ? '#393C41' : '#6B7280', radius: 4 });
  h.text(box, placeholder, { x: 14, y: 14, size: 14, color: '#8E939C', width: 230 });
  var send = h.frame(box, { name: 'send', x: 272, y: 8, w: 32, h: 32, fill: off ? '#393C41' : '#F0F0FA', radius: 4 });
  materialIcon(send, 'send', 8, 8, 16, '#171A20');
  return box;
}

function stockBlock(panel) {
  sectionTitle(panel, 'STOCK', 20);
  field(panel, { label: 'NAME', x: 24, y: 56, w: 312, value: 'PLATE-001' });
  field(panel, { label: 'MATERIAL', x: 24, y: 118, w: 312, value: '6061-T6', menu: true, swatch: '#E6E8ED' });
  field(panel, { label: 'LENGTH', x: 24, y: 180, w: 96, value: '120', suffix: 'MM' });
  field(panel, { label: 'WIDTH', x: 132, y: 180, w: 96, value: '80', suffix: 'MM' });
  field(panel, { label: 'THICK', x: 240, y: 180, w: 96, value: '12', suffix: 'MM' });
}

function tick(parent, x, y) {
  var s = h.frame(parent, { name: 'tick', x: x, y: y, w: 9, h: 1, fill: '#C8CDD6' });
  s.rotation = 52;
  return s;
}

function dimH(parent, x, yTop, w, text) {
  var ink = '#C8CDD6';
  var yLine = yTop + 26;
  h.frame(parent, { name: 'ext-l', x: x, y: yTop + 6, w: 1, h: 22, fill: ink });
  h.frame(parent, { name: 'ext-r', x: x + w - 1, y: yTop + 6, w: 1, h: 22, fill: ink });
  h.frame(parent, { name: 'dim-l', x: x, y: yLine, w: w / 2 - 26, h: 1, fill: ink });
  h.frame(parent, { name: 'dim-r', x: x + w / 2 + 26, y: yLine, w: w / 2 - 26, h: 1, fill: ink });
  label(parent, text, { x: x + w / 2 - 26, y: yLine - 8, size: 12, color: '#F0F0FA', align: 'CENTER', width: 52, track: 4 });
  tick(parent, x - 4, yLine);
  tick(parent, x + w - 5, yLine);
}

function dimV(parent, plateX, plateY, plateH, text) {
  var ink = '#C8CDD6';
  var xLine = plateX - 28;
  h.frame(parent, { name: 'ext-t', x: xLine, y: plateY, w: 22, h: 1, fill: ink });
  h.frame(parent, { name: 'ext-b', x: xLine, y: plateY + plateH, w: 22, h: 1, fill: ink });
  var mid = plateY + plateH / 2;
  h.frame(parent, { name: 'dim-t', x: xLine, y: plateY, w: 1, h: plateH / 2 - 16, fill: ink });
  h.frame(parent, { name: 'dim-b', x: xLine, y: mid + 16, w: 1, h: plateH / 2 - 16, fill: ink });
  label(parent, text, { x: xLine - 22, y: mid - 8, size: 12, color: '#F0F0FA', track: 4 });
  tick(parent, xLine - 4, plateY);
  tick(parent, xLine - 4, plateY + plateH);
}

function bore(parent, sx, sy, d) {
  var hole = figma.createEllipse();
  hole.name = 'bore';
  hole.resize(d, d);
  hole.x = sx;
  hole.y = sy;
  hole.fills = h.paint('#1A1C20');
  hole.strokes = h.paint('#E6E8ED');
  hole.strokeWeight = 1;
  parent.appendChild(hole);
  var cx = sx + d / 2;
  var cy = sy + d / 2;
  h.frame(parent, { name: 'cmx', x: cx - 4, y: cy, w: 8, h: 1, fill: '#E4E7EE' });
  h.frame(parent, { name: 'cmy', x: cx, y: cy - 4, w: 1, h: 8, fill: '#E4E7EE' });
}

function plate(parent, o) {
  var g = plateGeom();
  var px = g.px;
  var py = g.py;
  var pw = g.pw;
  var ph = g.ph;
  var body = h.frame(parent, { name: 'stock', x: px, y: py, w: pw, h: ph, stroke: '#C5C9D1' });
  metalFill(body);
  h.frame(body, { name: 'ox', x: 0, y: ph - 1, w: 28, h: 1, fill: '#3C4250' });
  h.frame(body, { name: 'oy', x: 0, y: ph - 28, w: 1, h: 28, fill: '#3C4250' });
  var origin = figma.createEllipse();
  origin.name = 'origin-datum';
  origin.resize(14, 14);
  origin.x = -7;
  origin.y = ph - 7;
  origin.fills = h.paint('#E6E8ED');
  origin.strokes = h.paint('#171A20');
  origin.strokeWeight = 1.25;
  body.appendChild(origin);
  var q = figma.createEllipse();
  q.name = 'origin-quadrant';
  q.resize(14, 14);
  q.x = -7;
  q.y = ph - 7;
  q.fills = h.paint('#171A20');
  q.arcData = { startingAngle: -Math.PI / 2, endingAngle: 0, innerRadius: 0 };
  body.appendChild(q);
  var q2 = figma.createEllipse();
  q2.name = 'origin-quadrant-2';
  q2.resize(14, 14);
  q2.x = -7;
  q2.y = ph - 7;
  q2.fills = h.paint('#171A20');
  q2.arcData = { startingAngle: Math.PI / 2, endingAngle: Math.PI, innerRadius: 0 };
  body.appendChild(q2);
  h.text(body, '0, 0', { x: 12, y: ph - 22, size: 11, weight: 'Medium', color: '#171A20' });

  if (o.pocket) {
    var pk = h.frame(body, { name: 'pocket', x: (60 - 20) * SCALE, y: (80 - 40 - 9) * SCALE, w: 40 * SCALE, h: 18 * SCALE, fill: '#C9CDD6', stroke: '#171A20', radius: 3 * SCALE });
    pk.strokeWeight = 1.25;
    if (o.selected) {
      var pbox = h.frame(body, { name: 'selection', x: pk.x - 8, y: pk.y - 8, w: pk.width + 16, h: pk.height + 16, dashed: true, stroke: '#171A20' });
      emptyFill(pbox);
      pbox.strokeWeight = 1.25;
      h.frame(body, { name: 'leader', x: pk.x + pk.width + 8, y: pk.y + pk.height / 2, w: 12, h: 1, fill: '#171A20' });
      h.text(body, '40 × 18  ·  R3  ·  4 deep', { x: pk.x + pk.width + 24, y: pk.y + pk.height / 2 - 8, size: 12, weight: 'Medium', color: '#171A20' });
    }
  }
  if (o.slot) {
    var sl = h.frame(body, { name: 'slot', x: (60 - 15) * SCALE, y: (80 - 64 - 3) * SCALE, w: 30 * SCALE, h: 6 * SCALE, fill: '#C9CDD6', stroke: '#171A20', radius: 3 * SCALE });
    sl.strokeWeight = 1.25;
    h.frame(body, { name: 'slot-centerline', x: sl.x + 3 * SCALE, y: sl.y + 3 * SCALE, w: 24 * SCALE, h: 1, fill: '#5C6370' });
  }
  if (o.holes) {
    var pts = [[12, 12], [108, 12], [12, 68], [108, 68]];
    for (var i = 0; i < pts.length; i++) {
      var d = 5 * SCALE;
      var sx = pts[i][0] * SCALE - d / 2;
      var sy = (80 - pts[i][1]) * SCALE - d / 2;
      bore(body, sx, sy, d);
      if (i === 0 && o.selected) {
        var box = h.frame(body, {
          name: 'selection',
          x: sx - 10,
          y: sy - 10,
          w: d + 20,
          h: d + 20,
          dashed: true,
          stroke: '#171A20'
        });
        emptyFill(box);
        box.strokeWeight = 1.25;
        h.frame(body, { name: 'leader', x: sx + d + 2, y: sy + d / 2, w: 12, h: 1, fill: '#171A20' });
        h.text(body, 'M6  ·  Ø 5.0', { x: sx + d + 16, y: sy + d / 2 - 8, size: 12, weight: 'Medium', color: '#171A20' });
      }
    }
  }

  dimH(parent, px, py + ph, pw, '120');
  dimV(parent, px, py, ph, '80');
  label(parent, 'X', { x: px + pw + 8, y: py + ph + 16, size: 11, color: '#8E939C', track: 8 });
  label(parent, 'Y', { x: px - 46, y: py + 2, size: 11, color: '#8E939C', width: 16, track: 8 });
  return { x: px, y: py, w: pw, h: ph };
}

function miniPlate(parent, x, y) {
  var s = 1.85;
  var w = Math.round(120 * s);
  var hgt = Math.round(80 * s);
  var body = h.frame(parent, { name: 'mini', x: x, y: y, w: w, h: hgt, stroke: '#C5C9D1' });
  metalFill(body);
  var pts = [[12, 12], [108, 12], [12, 68], [108, 68]];
  for (var i = 0; i < pts.length; i++) {
    var d = 5 * s;
    bore(body, pts[i][0] * s - d / 2, (80 - pts[i][1]) * s - d / 2, d);
  }
  return body;
}

function ghostHole(parent, geom) {
  var shopX = 130;
  var shopY = 40;
  var d = 5 * SCALE;
  var x = geom.x + shopX * SCALE - d / 2;
  var y = geom.y + (80 - shopY) * SCALE - d / 2;
  var e = figma.createEllipse();
  e.name = 'rejected-hole';
  e.resize(d, d);
  e.x = x;
  e.y = y;
  e.fills = [{ type: 'SOLID', color: h.hex('#E82127'), opacity: 0.18 }];
  e.strokes = h.paint('#E82127');
  e.strokeWeight = 1.5;
  e.dashPattern = [4, 3];
  parent.appendChild(e);
  h.text(parent, 'outside', { x: x + d + 8, y: y + 2, size: 12, weight: 'Medium', color: '#FF5A5F' });
}

function setupRow(parent, y, k, v) {
  label(parent, k, { x: 16, y: y, size: 11, color: '#8E939C', track: 6 });
  h.text(parent, v, { x: 120, y: y - 1, size: 13, color: '#F0F0FA' });
}

function zoom(parent) {
  var bar = h.frame(parent, { name: 'zoom', x: CANVAS_W - 176, y: CANVAS_H - 56, w: 156, h: 36, fill: '#171A20', radius: 4 });
  hairline(bar);
  h.frame(bar, { name: 'zd1', x: 44, y: 8, w: 1, h: 20, fill: '#6B7280' });
  h.frame(bar, { name: 'zd2', x: 110, y: 8, w: 1, h: 20, fill: '#6B7280' });
  label(bar, '−', { x: 0, y: 7, size: 16, color: '#F0F0FA', align: 'CENTER', width: 44 });
  var fit = label(bar, 'FIT', { x: 44, y: 11, size: 11, color: '#F0F0FA', align: 'CENTER', width: 66, track: 8 });
  fit.y = 11;
  label(bar, '+', { x: 110, y: 7, size: 16, color: '#F0F0FA', align: 'CENTER', width: 46 });
  return bar;
}

function degGuide(parent) {
  var cx = 64;
  var cy = 92;
  var r = 44;
  var arc = figma.createEllipse();
  arc.name = 'deg-arc';
  arc.resize(r * 2, r * 2);
  arc.x = cx - r;
  arc.y = cy - r;
  arc.fills = [{ type: 'SOLID', color: h.hex('#E4E0D4'), opacity: 0.28 }];
  arc.arcData = { startingAngle: -Math.PI / 2, endingAngle: 0, innerRadius: 0.78 };
  parent.appendChild(arc);
  h.frame(parent, { name: 'd0', x: cx + r - 2, y: cy, w: 12, h: 1, fill: '#E4E0D4' });
  h.frame(parent, { name: 'd90', x: cx, y: cy - r - 10, w: 1, h: 12, fill: '#E4E0D4' });
  var mid = h.frame(parent, { name: 'd45', x: cx + 24, y: cy - 30, w: 12, h: 1, fill: '#E4E0D4' });
  mid.rotation = -45;
  label(parent, '0°', { x: cx + r + 8, y: cy - 6, size: 10, color: '#D5D0C4' });
  label(parent, '45°', { x: cx + 34, y: cy - r + 2, size: 10, color: '#D5D0C4' });
  label(parent, '90°', { x: cx - 26, y: cy - r - 14, size: 10, color: '#D5D0C4' });
  label(parent, 'DEG', { x: cx - 12, y: cy + 8, size: 9, color: '#8E939C', track: 6 });
}

function matScales(parent) {
  var g = plateGeom();
  var originX = g.px;
  var originY = g.py + g.ph;
  var ink = '#D5D0C4';
  var railX = 36;
  h.frame(parent, { name: 'mm-base', x: railX, y: g.py, w: 1, h: g.ph, fill: ink });
  var mm;
  for (mm = 0; mm <= 80; mm += 10) {
    var yy = Math.round(originY - mm * SCALE);
    var big = mm % 20 === 0;
    var len = big ? 12 : 6;
    h.frame(parent, { name: 'mm-tick', x: railX - len, y: yy, w: len, h: 1, fill: ink });
    if (big) {
      label(parent, String(mm), { x: 0, y: yy - 6, size: 10, color: ink, align: 'RIGHT', width: railX - 16 });
    }
  }
  label(parent, 'MM', { x: 6, y: g.py - 18, size: 9, color: '#8E939C', track: 6 });

  var inch = 25.4 * SCALE;
  var baseY = originY + 86;
  var steps = 10;
  h.frame(parent, { name: 'in-base', x: originX, y: baseY, w: Math.round(inch * 5), h: 1, fill: ink });
  var n;
  for (n = 0; n <= steps; n++) {
    var xx = Math.round(originX + (n * inch) / 2);
    var whole = n % 2 === 0;
    h.frame(parent, { name: 'in-tick', x: xx, y: baseY, w: 1, h: whole ? 10 : 5, fill: ink });
    if (whole && n > 0) {
      label(parent, String(n / 2), { x: xx - 10, y: baseY + 12, size: 10, color: ink, align: 'CENTER', width: 20 });
    }
  }
  label(parent, 'IN', { x: originX - 26, y: baseY - 2, size: 9, color: '#8E939C', track: 6 });
  degGuide(parent);
}

function makeCenter(board) {
  var center = h.frame(board, { name: 'canvas', x: RAIL_W, y: 56, w: CANVAS_W, h: CANVAS_H });
  stageFill(center);
  center.clipsContent = true;
  shopGrid(center);
  matScales(center);
  return center;
}

function makePlainCenter(board) {
  var center = h.frame(board, { name: 'canvas', x: RAIL_W, y: 56, w: CANVAS_W, h: CANVAS_H });
  stageFill(center);
  center.clipsContent = true;
  return center;
}

function traceRow(parent, y, ok, name, detail) {
  var row = h.frame(parent, { name: 'trace-' + name, x: 24, y: y, w: INSPECTOR_W - 48, h: 24 });
  emptyFill(row);
  label(row, ok === 'run' ? '…' : (ok ? 'OK' : 'NO'), { x: 0, y: 5, size: 10, color: ok === 'run' ? '#CCCCCC' : (ok ? '#F0F0FA' : '#FF5A5F'), track: 8 });
  var t = h.text(row, name, { x: 32, y: 3, size: 13, color: '#F0F0FA' });
  t.fontName = { family: mono, style: 'Regular' };
  h.text(row, detail, { x: 190, y: 4, size: 12, color: '#8E939C', width: 122 });
  return row;
}

function ghostButton(parent, x, y, w, text) {
  var b = h.frame(parent, { name: text, x: x, y: y, w: w, h: 28, radius: 4 });
  emptyFill(b);
  hairline(b);
  var l = label(b, text, { x: 0, y: 8, size: 10, color: '#F0F0FA', align: 'CENTER', width: w, track: 8 });
  l.y = 8;
  return b;
}

function inspector(board) {
  var panel = h.frame(board, { name: 'inspector', x: INSPECTOR_X, y: 56, w: INSPECTOR_W, h: CANVAS_H, fill: '#171A20' });
  h.frame(panel, { name: 'inspector-line', x: 0, y: 0, w: 1, h: CANVAS_H, fill: '#393C41' });
  return panel;
}

function statusLeft(status, text, color) {
  label(status, text, { x: 20, y: 10, size: 12, color: color, track: 4 });
}

function statusRight(status, text) {
  label(status, text, { x: 900, y: 10, size: 12, color: '#8E939C', align: 'RIGHT', width: 520, track: 6 });
}

var found = h.board({ name: 'Foundations', w: 1440, h: 920, fill: '#000000' });
label(found, 'PLATE  /  FOUNDATIONS', { x: 48, y: 36, size: 13, weight: 'Medium', color: '#F0F0FA', track: 10 });
h.text(found, 'Quiet chrome. A flat mat under the part. One red for errors. Lime only while Grok is working.', { x: 48, y: 64, size: 16, color: '#CCCCCC', width: 880 });

var swatches = [
  { name: 'VOID', hex: '#000000' },
  { name: 'MAT', hex: '#1C1F24' },
  { name: 'SURFACE', hex: '#171A20' },
  { name: 'FIELD', hex: '#000000' },
  { name: 'RULE', hex: '#393C41' },
  { name: 'FIELD BORDER', hex: '#6B7280' },
  { name: 'TEXT', hex: '#F0F0FA' },
  { name: 'MUTED', hex: '#CCCCCC' },
  { name: 'DIM', hex: '#8E939C' },
  { name: 'PLATE', hex: '#E6E8ED' },
  { name: 'INK', hex: '#171A20' },
  { name: 'ERROR', hex: '#E82127' },
  { name: 'ERROR TEXT', hex: '#FF5A5F' },
  { name: 'LIVE', hex: '#75FBA6' }
];
for (var s = 0; s < swatches.length; s++) {
  var sx = 48 + (s % 5) * 270;
  var sy = 130 + Math.floor(s / 5) * 90;
  h.frame(found, { name: swatches[s].name, x: sx, y: sy, w: 56, h: 56, fill: swatches[s].hex, stroke: '#6B7280', radius: 4 });
  label(found, swatches[s].name, { x: sx + 72, y: sy + 6, size: 11, color: '#F0F0FA', track: 8 });
  label(found, swatches[s].hex, { x: sx + 72, y: sy + 28, size: 14, color: '#8E939C' });
}

label(found, 'CONTROLS', { x: 48, y: 460, size: 11, color: '#8E939C', track: 10 });
label(found, 'MATERIAL SYMBOLS  ·  OUTLINED  ·  200', { x: 160, y: 460, size: 11, color: '#8E939C', track: 8 });
var sampleRail = h.frame(found, { name: 'sample-rail', x: 48, y: 490, w: 84, h: 220, fill: '#171A20', radius: 4 });
toolCell(sampleRail, { name: 'SELECT', key: 'V', icon: 'select', y: 12, active: true });
toolCell(sampleRail, { name: 'HOLE', key: 'H', icon: 'hole', y: 96, active: false });

var samplePrompt = h.frame(found, { name: 'sample-prompt', x: 180, y: 490, w: 312, h: 58, fill: '#000000', stroke: '#6B7280', radius: 4 });
label(samplePrompt, 'HOLES', { x: 14, y: 10, size: 10, color: '#8E939C', track: 8 });
h.text(samplePrompt, 'Four M6, 12 mm from each corner', { x: 14, y: 28, size: 13, color: '#F0F0FA', width: 250 });

var sampleSend = h.frame(found, { name: 'sample-send', x: 180, y: 566, w: 312, h: 48, fill: '#000000', stroke: '#6B7280', radius: 4 });
h.text(sampleSend, 'Describe a feature', { x: 14, y: 14, size: 14, color: '#8E939C' });
var sampleBtn = h.frame(sampleSend, { name: 'send', x: 272, y: 8, w: 32, h: 32, fill: '#F0F0FA', radius: 4 });
materialIcon(sampleBtn, 'send', 8, 8, 16, '#171A20');

h.text(found, 'Hole at (130, 40) is outside the 120 × 80 mm stock.', { x: 180, y: 632, size: 13, color: '#FF5A5F', width: 312 });
h.text(found, 'The plate did not change.', { x: 180, y: 654, size: 13, color: '#8E939C', width: 312 });

dotLive(found, 540, 578);
label(found, 'STATES', { x: 540, y: 460, size: 11, color: '#8E939C', track: 10 });
var focusSample = h.frame(found, { name: 'focus-ring', x: 540, y: 490, w: 120, h: 28, radius: 4 });
emptyFill(focusSample);
hairline(focusSample);
var focusRing = h.frame(found, { name: 'focus-outline', x: 537, y: 487, w: 126, h: 34, radius: 6, stroke: '#F0F0FA' });
emptyFill(focusRing);
focusRing.strokeWeight = 2;
var fl = label(focusSample, 'FOCUS', { x: 0, y: 8, size: 10, color: '#F0F0FA', align: 'CENTER', width: 120, track: 8 });
fl.y = 8;
label(found, '2PX TEXT OUTLINE, 2PX OFFSET, KEYBOARD ONLY', { x: 680, y: 498, size: 10, color: '#8E939C', track: 6 });
label(found, 'SAVING…', { x: 540, y: 630, size: 11, color: '#CCCCCC', track: 8 });
label(found, 'SAVED', { x: 640, y: 630, size: 11, color: '#8E939C', track: 8 });
label(found, 'NOT SAVED', { x: 720, y: 630, size: 11, color: '#FF5A5F', track: 8 });
label(found, 'HEADER SAVE MARK', { x: 540, y: 652, size: 10, color: '#8E939C', track: 6 });
label(found, 'CONTRAST  ·  TEXT ≥ 4.5 : 1  ·  CONTROL EDGES ≥ 3 : 1  ·  RED FILL IS NEVER TEXT', { x: 48, y: 790, size: 11, color: '#CCCCCC', track: 6 });
label(found, 'LIVE  ·  ONLY WHILE GROK IS WORKING', { x: 556, y: 572, size: 11, color: '#75FBA6', track: 6 });
label(found, 'Font ' + family + '   ·   G-code ' + mono, { x: 48, y: 860, size: 13, color: '#8E939C' });

function dotLive(parent, x, y) {
  var e = figma.createEllipse();
  e.resize(8, 8);
  e.x = x;
  e.y = y;
  e.fills = h.paint('#75FBA6');
  parent.appendChild(e);
}

var empty = h.board({ name: 'Draw — empty', w: 1440, h: 900, fill: '#000000' });
var emptyShell = shell(empty, 'draw');
var emptyCenter = makeCenter(empty);
plate(emptyCenter, { holes: false });
h.text(emptyCenter, 'H hole     P pocket     S slot     or describe a feature on the right.', { x: 24, y: CANVAS_H - 48, size: 13, color: '#C8CDD6', width: 680 });
zoom(emptyCenter);
statusLeft(emptyShell.status, 'X  —       Y  —', '#8E939C');
statusRight(emptyShell.status, 'SNAP  1 MM');
var emptyPanel = inspector(empty);
stockBlock(emptyPanel);
sectionTitle(emptyPanel, 'FEATURE', 276);
h.text(emptyPanel, 'Nothing selected. Click the plate, or start from a prompt.', { x: 24, y: 312, size: 13, color: '#8E939C', width: 312 });
sectionTitle(emptyPanel, 'GROK', 390);
promptRow(emptyPanel, { kicker: 'HOLES', title: 'Four M6, 12 mm from each corner', y: 428 });
promptRow(emptyPanel, { kicker: 'PATTERN', title: 'Six M5 on a 50 mm bolt circle', y: 496 });
promptRow(emptyPanel, { kicker: 'POCKET', title: '40 × 18 pocket, 4 mm deep, centered', y: 564 });
composer(emptyPanel, 640, 'Describe a feature');

var drawn = h.board({ name: 'Draw — four holes', w: 1440, h: 900, fill: '#000000' });
var drawnShell = shell(drawn, 'draw');
var drawnCenter = makeCenter(drawn);
plate(drawnCenter, { holes: true, selected: true });
zoom(drawnCenter);
statusLeft(drawnShell.status, 'X  12.0       Y  12.0', '#F0F0FA');
statusRight(drawnShell.status, 'SNAP  1 MM     4 FEATURES');
var drawnPanel = inspector(drawn);
stockBlock(drawnPanel);
sectionTitle(drawnPanel, 'SELECTED  ·  HOLE', 276);
h.text(drawnPanel, 'M6 through  ·  drill Ø 5.0  ·  Z-14.0', { x: 24, y: 312, size: 13, color: '#F0F0FA', width: 312 });
field(drawnPanel, { label: 'X', x: 24, y: 344, w: 148, value: '12', suffix: 'MM' });
field(drawnPanel, { label: 'Y', x: 188, y: 344, w: 148, value: '12', suffix: 'MM' });
field(drawnPanel, { label: 'THREAD', x: 24, y: 406, w: 148, value: 'M6', menu: true });
field(drawnPanel, { label: 'DRILL', x: 188, y: 406, w: 148, value: '5.0' });
label(drawnPanel, 'TAP IS A LATER OP. IT IS NOT IN THE PROGRAM.', { x: 24, y: 478, size: 10, color: '#8E939C', width: 300, track: 4 });
var remove = h.frame(drawnPanel, { name: 'remove', x: 24, y: 504, w: 96, h: 28, radius: 4 });
emptyFill(remove);
hairline(remove);
var removeLabel = label(remove, 'REMOVE', { x: 0, y: 7, size: 10, color: '#CCCCCC', align: 'CENTER', width: 96, track: 8 });
removeLabel.y = 8;
sectionTitle(drawnPanel, 'GROK', 552);
var said = h.frame(drawnPanel, { name: 'user', x: 24, y: 590, w: 312, h: 44, fill: '#000000', radius: 4 });
h.text(said, 'Four M6 holes, 12 mm from each corner.', { x: 12, y: 12, size: 13, color: '#F0F0FA', width: 288 });
traceRow(drawnPanel, 642, true, 'add_corner_holes', '4 holes · rev 2');
h.text(drawnPanel, 'Added four M6 through holes, 12 mm in from each corner.', { x: 24, y: 674, size: 13, color: '#CCCCCC', width: 312 });
label(drawnPanel, 'UNDO  ⌘Z', { x: 24, y: 718, size: 10, color: '#8E939C', track: 8 });
composer(drawnPanel, 744, 'Describe a feature');

var program = h.board({ name: 'Program', w: 1440, h: 900, fill: '#000000' });
var programShell = shell(program, 'program');
var programCenter = makePlainCenter(program);
var banner = h.frame(programCenter, { name: 'banner', x: 16, y: 16, w: CANVAS_W - 32, h: 52, fill: '#171A20', radius: 4 });
hairline(banner);
label(banner, 'TRAINING OUTPUT', { x: 16, y: 8, size: 10, color: '#8E939C', track: 8 });
h.text(banner, 'Do not send this file to a machine. M6 is drilled Ø 5.0. The tap is not here.', { x: 16, y: 26, size: 13, color: '#F0F0FA', width: 920 });

var dock = h.frame(programCenter, { name: 'ops', x: 0, y: 84, w: 300, h: CANVAS_H - 84, fill: '#12141A' });
h.frame(dock, { name: 'ops-line', x: 299, y: 0, w: 1, h: CANVAS_H - 84, fill: '#393C41' });
label(dock, 'OPERATIONS', { x: 16, y: 16, size: 11, color: '#8E939C', track: 10 });
label(dock, '10', { x: 16, y: 44, size: 11, color: '#8E939C', track: 6 });
h.text(dock, 'Drill  ·  T1  ·  Ø 5.0', { x: 16, y: 62, size: 14, color: '#F0F0FA' });
h.text(dock, '4 holes  ·  through  ·  Z-14.0  (12 + tip 1.5 + 0.5)', { x: 16, y: 82, size: 12, color: '#8E939C' });
label(dock, '20', { x: 16, y: 112, size: 11, color: '#8E939C', track: 6 });
h.text(dock, 'Tap M6  ·  not in this file', { x: 16, y: 130, size: 14, color: '#8E939C' });

label(dock, 'SETUP', { x: 16, y: 172, size: 11, color: '#8E939C', track: 10 });
h.frame(dock, { name: 'setup-rule', x: 16, y: 192, w: 268, h: 1, fill: '#393C41' });
setupRow(dock, 208, 'OFFSET', 'G54');
setupRow(dock, 234, 'RETRACT', 'Z 25');
setupRow(dock, 260, 'TOOL', 'T1  Ø 5.0 drill');
setupRow(dock, 286, 'STOCK', '120 × 80 × 12');
label(dock, 'PART', { x: 16, y: 330, size: 11, color: '#8E939C', track: 10 });
miniPlate(dock, 48, 356);

var codePanel = h.frame(programCenter, { name: 'gcode', x: 316, y: 96, w: 664, h: 688, fill: '#0A0A0A', radius: 4 });
hairline(codePanel);
label(codePanel, 'PLATE-001.NC', { x: 16, y: 14, size: 11, color: '#8E939C', track: 8 });
var copy = h.frame(codePanel, { name: 'copy', x: 568, y: 10, w: 80, h: 26, radius: 4 });
emptyFill(copy);
hairline(copy);
var copyLabel = label(copy, 'COPY', { x: 0, y: 6, size: 10, color: '#F0F0FA', align: 'CENTER', width: 80, track: 8 });
copyLabel.y = 7;
h.frame(codePanel, { name: 'gutter', x: 1, y: 46, w: 44, h: 608, fill: '#070709' });
var codeFoot = h.frame(codePanel, { name: 'code-foot', x: 1, y: 654, w: 662, h: 33, fill: '#101114' });
label(codeFoot, 'MM  ·  ABSOLUTE  ·  G54', { x: 360, y: 10, size: 10, color: '#8E939C', align: 'RIGHT', width: 286, track: 6 });

var gcodeLines = [
  '%',
  '(PLATE-001)',
  '(TRAINING OUTPUT - DO NOT RUN ON A MACHINE)',
  '(MM  G54 AT STOCK LOWER-LEFT  TOP FACE  Z0)',
  'G21 G90 G17 G94',
  'G54',
  '',
  '(OP 10  T1  DRILL D5.000  4 HOLES)',
  'T1 M06',
  'S2500 M03',
  'G00 Z25.000',
  'G00 X12.000 Y12.000',
  'G81 X12.000 Y12.000 Z-14.000 R2.000 F250',
  'X108.000 Y12.000',
  'X108.000 Y68.000',
  'X12.000 Y68.000',
  'G80',
  'G00 Z25.000',
  'M05',
  '',
  '(OP 20  TAP M6  NOT IN THIS FILE)',
  'M30',
  '%'
];
label(codeFoot, gcodeLines.length + ' LINES', { x: 14, y: 10, size: 10, color: '#8E939C', track: 6 });
var numbers = '';
var source = '';
for (var li = 0; li < gcodeLines.length; li++) {
  var n = String(li + 1);
  if (n.length < 2) n = ' ' + n;
  numbers += n + '\n';
  source += gcodeLines[li] + '\n';
}
var numNode = h.text(codePanel, numbers, { x: 8, y: 56, size: 13, color: '#8E939C', width: 32 });
numNode.fontName = { family: mono, style: 'Regular' };
var srcNode = h.text(codePanel, source, { x: 60, y: 56, size: 13, color: '#F0F0FA', width: 580 });
srcNode.fontName = { family: mono, style: 'Regular' };

statusLeft(programShell.status, '4 FEATURES', '#CCCCCC');
statusRight(programShell.status, 'TRAINING FILE  ·  DO NOT RUN');
var programPanel = inspector(program);
stockBlock(programPanel);
sectionTitle(programPanel, 'THIS FILE', 276);
h.text(programPanel, 'One drill cycle. Four holes. No tap, no facing pass.', { x: 24, y: 316, size: 14, color: '#F0F0FA', width: 312 });
h.text(programPanel, 'Feeds are placeholders for 6061-T6. A person still has to accept the setup.', { x: 24, y: 360, size: 13, color: '#8E939C', width: 312 });

var blocked = h.board({ name: 'Draw — rejected', w: 1440, h: 900, fill: '#000000' });
var blockedShell = shell(blocked, 'draw');
var blockedCenter = makeCenter(blocked);
var blockedGeom = plate(blockedCenter, { holes: false });
ghostHole(blockedCenter, blockedGeom);
zoom(blockedCenter);
statusLeft(blockedShell.status, 'X  130.0       Y  40.0', '#FF5A5F');
statusRight(blockedShell.status, 'SNAP  1 MM');
var blockedPanel = inspector(blocked);
stockBlock(blockedPanel);
sectionTitle(blockedPanel, 'FEATURE', 276);
h.text(blockedPanel, 'That hole does not fit.', { x: 24, y: 316, size: 14, weight: 'Medium', color: '#FF5A5F', width: 312 });
h.text(blockedPanel, 'Hole at (130, 40) is outside the 120 × 80 mm stock.', { x: 24, y: 340, size: 13, color: '#FF5A5F', width: 312 });
h.text(blockedPanel, 'The plate did not change.', { x: 24, y: 380, size: 13, color: '#8E939C', width: 312 });
sectionTitle(blockedPanel, 'GROK', 450);
promptRow(blockedPanel, { kicker: 'HOLES', title: 'Four M6, 12 mm from each corner', y: 488 });
promptRow(blockedPanel, { kicker: 'PATTERN', title: 'Six M5 on a 50 mm bolt circle', y: 556 });
composer(blockedPanel, 632, 'Describe a feature');

// ---------- Draw — pocket and slot ----------
var feat = h.board({ name: 'Draw — pocket and slot', w: 1440, h: 900, fill: '#000000' });
var featShell = shell(feat, 'draw');
var featCenter = makeCenter(feat);
plate(featCenter, { holes: false, pocket: true, slot: true, selected: true });
zoom(featCenter);
statusLeft(featShell.status, 'X  60.0       Y  40.0', '#F0F0FA');
statusRight(featShell.status, 'SNAP  1 MM     2 FEATURES');
var featPanel = inspector(feat);
stockBlock(featPanel);
sectionTitle(featPanel, 'SELECTED  ·  POCKET', 276);
h.text(featPanel, 'T2  ·  Ø 6.0 end mill  ·  2 passes of 2.0', { x: 24, y: 312, size: 13, color: '#F0F0FA', width: 312 });
field(featPanel, { label: 'X', x: 24, y: 344, w: 96, value: '60', suffix: 'MM' });
field(featPanel, { label: 'Y', x: 132, y: 344, w: 96, value: '40', suffix: 'MM' });
field(featPanel, { label: 'DEPTH', x: 240, y: 344, w: 96, value: '4', suffix: 'MM' });
field(featPanel, { label: 'LENGTH', x: 24, y: 406, w: 96, value: '40', suffix: 'MM' });
field(featPanel, { label: 'WIDTH', x: 132, y: 406, w: 96, value: '18', suffix: 'MM' });
field(featPanel, { label: 'CORNER R', x: 240, y: 406, w: 96, value: '3', suffix: 'MM' });
label(featPanel, 'CORNER R SETS THE LARGEST END MILL: Ø ≤ 2 × R.', { x: 24, y: 478, size: 10, color: '#8E939C', width: 312, track: 4 });
ghostButton(featPanel, 24, 504, 96, 'REMOVE');
sectionTitle(featPanel, 'GROK', 552);
promptRow(featPanel, { kicker: 'SLOT', title: 'Slot 30 × 6 above the pocket', y: 590 });
composer(featPanel, 744, 'Describe a feature');

// ---------- Draw — Grok working (read-only) ----------
var busy = h.board({ name: 'Draw — Grok working', w: 1440, h: 900, fill: '#000000' });
var busyShell = shell(busy, 'draw', { readOnly: true, save: 'SAVING…', saveColor: '#CCCCCC' });
var busyCenter = makeCenter(busy);
plate(busyCenter, { holes: true, selected: false });
zoom(busyCenter);
statusLeft(busyShell.status, 'READ-ONLY WHILE GROK WORKS', '#CCCCCC');
statusRight(busyShell.status, 'ROUND 2 OF 8');
var busyPanel = inspector(busy);
stockBlock(busyPanel);
sectionTitle(busyPanel, 'GROK', 276);
var ask = h.frame(busyPanel, { name: 'user', x: 24, y: 314, w: 312, h: 64, fill: '#000000', radius: 4 });
h.text(ask, 'Four M6 holes 12 mm from each corner, then a 40 × 18 pocket in the middle.', { x: 12, y: 12, size: 13, color: '#F0F0FA', width: 288 });
traceRow(busyPanel, 392, true, 'add_corner_holes', '4 holes · rev 2');
traceRow(busyPanel, 420, 'run', 'add_pocket', 'checking');
dotLive(busyPanel, 24, 466);
label(busyPanel, 'GROK IS WORKING', { x: 40, y: 461, size: 11, color: '#F0F0FA', track: 8 });
ghostButton(busyPanel, 24, 494, 96, 'STOP');
h.text(busyPanel, 'Stop keeps what already passed. Each step is its own undo.', { x: 24, y: 536, size: 13, color: '#8E939C', width: 312 });
composer(busyPanel, 744, 'Waiting for Grok', true);

// ---------- Draw — Grok not configured ----------
var off = h.board({ name: 'Draw — Grok off', w: 1440, h: 900, fill: '#000000' });
var offShell = shell(off, 'draw');
var offCenter = makeCenter(off);
plate(offCenter, { holes: false });
zoom(offCenter);
statusLeft(offShell.status, 'X  —       Y  —', '#8E939C');
statusRight(offShell.status, 'SNAP  1 MM');
var offPanel = inspector(off);
stockBlock(offPanel);
sectionTitle(offPanel, 'FEATURE', 276);
h.text(offPanel, 'Nothing selected. H hole, P pocket, S slot.', { x: 24, y: 312, size: 13, color: '#8E939C', width: 312 });
sectionTitle(offPanel, 'GROK', 390);
h.text(offPanel, 'Grok is not configured. The drawing still works.', { x: 24, y: 428, size: 14, weight: 'Medium', color: '#F0F0FA', width: 312 });
h.text(offPanel, 'Set XAI_API_KEY and GROK_MODEL in .env, then restart the api service.', { x: 24, y: 456, size: 13, color: '#8E939C', width: 312 });
composer(offPanel, 744, 'Grok is off', true);

var boards = [found, empty, drawn, feat, busy, off, program, blocked];
var names = ['foundations.png', 'draw-empty.png', 'draw-holes.png', 'draw-features.png', 'grok-working.png', 'grok-off.png', 'program.png', 'rejected.png'];
var outs = [];
for (var bi = 0; bi < boards.length; bi++) {
  var saved = await exportPng(boards[bi], names[bi], 1);
  outs.push(names[bi] + (saved ? ' ok' : ' missed'));
}
return { font: family, mono: mono, exports: outs };
