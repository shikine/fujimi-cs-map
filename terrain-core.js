(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TerrainCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function positive(value, name) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(name + ' must be a positive finite number.');
    return value;
  }

  function gridSize(width, height, targetSpacing, maxSegments = 400) {
    positive(width, 'width');
    positive(height, 'height');
    positive(targetSpacing, 'targetSpacing');
    if (!Number.isInteger(maxSegments) || maxSegments < 1 || maxSegments > 10000) {
      throw new Error('maxSegments must be an integer from 1 to 10000.');
    }
    const spacing = Math.max(targetSpacing, width / maxSegments, height / maxSegments);
    const xSegments = Math.max(1, Math.min(maxSegments, Math.ceil(width / spacing)));
    const ySegments = Math.max(1, Math.min(maxSegments, Math.ceil(height / spacing)));
    return { cols: xSegments + 1, rows: ySegments + 1, spacingX: width / xSegments, spacingY: height / ySegments };
  }

  function decodeGSI(r, g, b, a = 255) {
    if (![r, g, b, a].every(v => Number.isInteger(v) && v >= 0 && v <= 255) || a === 0) return NaN;
    const value = r * 65536 + g * 256 + b;
    if (value === 8388608) return NaN;
    return (value < 8388608 ? value : value - 16777216) / 100;
  }

  function buildMesh(grid, options) {
    if (!grid || !options) throw new Error('grid and options are required.');
    const { cols, rows, heights, widthMetres, heightMetres } = grid;
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2) {
      throw new Error('The elevation grid needs at least two rows and two columns.');
    }
    const topCount = cols * rows;
    if (!Number.isSafeInteger(topCount) || topCount > 2000000) throw new Error('The elevation grid is too large.');
    if (!heights || heights.length !== topCount) throw new Error('The elevation grid length does not match its dimensions.');
    positive(widthMetres, 'widthMetres');
    positive(heightMetres, 'heightMetres');
    const requestedAngle = grid.angleDegrees === undefined ? 0 : grid.angleDegrees;
    if (!Number.isFinite(requestedAngle)) throw new Error('angleDegrees must be a finite number.');
    const selectionAngleDegrees = ((requestedAngle % 360) + 360) % 360;
    const xBearing = (selectionAngleDegrees + 90) % 360;
    const { modelWidthMm, verticalExaggeration, baseMm } = options;
    positive(modelWidthMm, 'modelWidthMm');
    positive(verticalExaggeration, 'verticalExaggeration');
    positive(baseMm, 'baseMm');
    let minHeight = Infinity, maxHeight = -Infinity;
    for (let i = 0; i < topCount; i++) {
      const value = heights[i];
      if (!Number.isFinite(value)) throw new Error('The elevation grid contains missing or invalid heights.');
      if (value < minHeight) minHeight = value;
      if (value > maxHeight) maxHeight = value;
    }
    const scale = modelWidthMm / widthMetres;
    const modelDepthMm = heightMetres * scale;
    const modelHeightMm = (maxHeight - minHeight) * scale * verticalExaggeration + baseMm;
    if (![scale, modelDepthMm, modelHeightMm].every(Number.isFinite)) throw new Error('The model dimensions are too large.');

    // The boundary follows the top surface counterclockwise, starting at local top-left.
    const perimeter = [];
    for (let r = 0; r < rows; r++) perimeter.push(r * cols);
    for (let c = 1; c < cols; c++) perimeter.push((rows - 1) * cols + c);
    for (let r = rows - 2; r >= 0; r--) perimeter.push(r * cols + cols - 1);
    for (let c = cols - 2; c >= 1; c--) perimeter.push(c);
    const boundaryCount = perimeter.length;
    const centreIndex = topCount + boundaryCount;
    const positions = new Float64Array((centreIndex + 1) * 3);
    for (let r = 0; r < rows; r++) {
      const y = modelDepthMm * (0.5 - r / (rows - 1));
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c;
        positions[id * 3] = modelWidthMm * (c / (cols - 1) - 0.5);
        positions[id * 3 + 1] = y;
        positions[id * 3 + 2] = (heights[id] - minHeight) * scale * verticalExaggeration + baseMm;
      }
    }
    for (let p = 0; p < boundaryCount; p++) {
      const upper = perimeter[p] * 3;
      const lower = (topCount + p) * 3;
      positions[lower] = positions[upper];
      positions[lower + 1] = positions[upper + 1];
      // Bottom vertices and the centre are at zero by typed-array initialization.
    }
    const triangleCount = 2 * (cols - 1) * (rows - 1) + 3 * boundaryCount;
    const indices = new Uint32Array(triangleCount * 3);
    let cursor = 0;
    function triangle(a, b, c) { indices[cursor++] = a; indices[cursor++] = b; indices[cursor++] = c; }
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c, b = a + 1, south = a + cols, southeast = south + 1;
        triangle(a, south, b);
        triangle(b, south, southeast);
      }
    }
    for (let p = 0; p < boundaryCount; p++) {
      const next = (p + 1) % boundaryCount;
      const topA = perimeter[p], topB = perimeter[next];
      const bottomA = topCount + p, bottomB = topCount + next;
      triangle(topB, topA, bottomA);
      triangle(topB, bottomA, bottomB);
      triangle(centreIndex, bottomB, bottomA);
    }
    return {
      positions,
      indices,
      metadata: {
        minHeight,
        maxHeight,
        elevationRangeMetres: maxHeight - minHeight,
        modelDimensions: { widthMm: modelWidthMm, depthMm: modelDepthMm, heightMm: modelHeightMm },
        groundDimensions: { widthMetres, heightMetres },
        scaleMmPerMetre: scale,
        verticalExaggeration,
        baseMm,
        cols,
        rows,
        vertexCount: positions.length / 3,
        triangleCount,
        spacingMetres: { x: widthMetres / (cols - 1), y: heightMetres / (rows - 1) },
        units: 'mm',
        selectionAngleDegrees,
        orientation: `X bearing ${xBearing} deg, Y bearing ${selectionAngleDegrees} deg (clockwise from north), Z up; centred XY; bottom Z = 0`,
      },
    };
  }

  function validateMesh(mesh) {
    if (!mesh || !mesh.positions || !mesh.indices || mesh.positions.length % 3 || mesh.indices.length % 3) {
      throw new Error('A mesh must contain complete vertices and triangles.');
    }
    const vertexCount = mesh.positions.length / 3;
    for (const v of mesh.positions) if (!Number.isFinite(v) || Math.abs(v) > 3.4028234663852886e38) throw new Error('Invalid mesh coordinate.');
    for (const i of mesh.indices) if (!Number.isInteger(i) || i < 0 || i >= vertexCount) throw new Error('Invalid mesh triangle index.');
  }

  function makeSTL(mesh) {
    validateMesh(mesh);
    const { positions: p, indices } = mesh;
    const count = indices.length / 3;
    const buffer = new ArrayBuffer(84 + count * 50);
    const bytes = new Uint8Array(buffer);
    const header = 'Terrain model; units mm; local XY, Z up; see metadata.json for orientation';
    for (let i = 0; i < header.length; i++) bytes[i] = header.charCodeAt(i);
    const view = new DataView(buffer);
    view.setUint32(80, count, true);
    let offset = 84;
    for (let t = 0; t < indices.length; t += 3) {
      const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz);
      if (!Number.isFinite(length) || length === 0) throw new Error('A mesh triangle has zero area.');
      for (const value of [nx / length, ny / length, nz / length]) { view.setFloat32(offset, value, true); offset += 4; }
      for (const v of [a, b, c]) for (let k = 0; k < 3; k++) { view.setFloat32(offset, p[v + k], true); offset += 4; }
      view.setUint16(offset, 0, true);
      offset += 2;
    }
    return buffer;
  }

  function makeOBJ(mesh) {
    validateMesh(mesh);
    const orientation = mesh.metadata && mesh.metadata.orientation || 'Local XY, Z up; see metadata.json for orientation';
    const lines = ['# Terrain model; coordinate units: millimetres', '# ' + orientation, 'o terrain'];
    const { positions, indices } = mesh;
    for (let i = 0; i < positions.length; i += 3) lines.push('v ' + positions[i] + ' ' + positions[i + 1] + ' ' + positions[i + 2]);
    for (let i = 0; i < indices.length; i += 3) lines.push('f ' + (indices[i] + 1) + ' ' + (indices[i + 1] + 1) + ' ' + (indices[i + 2] + 1));
    return lines.join('\n') + '\n';
  }

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let k = 0; k < 8; k++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    crcTable[n] = value >>> 0;
  }
  function crc32(bytes) {
    let value = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) value = crcTable[(value ^ bytes[i]) & 255] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
  }

  function makeZip(entries) {
    if (!Array.isArray(entries) || entries.length > 65535) throw new Error('Invalid ZIP entry list.');
    const encoder = new TextEncoder();
    const names = new Set();
    let localSize = 0, centralSize = 0;
    const files = entries.map(entry => {
      if (!entry || typeof entry.name !== 'string' || !entry.name || /(^[\\/]|^[a-z]:|\\|\0)/i.test(entry.name) || entry.name.split('/').includes('..')) {
        throw new Error('ZIP names must be relative paths.');
      }
      if (names.has(entry.name)) throw new Error('Duplicate ZIP filename.');
      names.add(entry.name);
      const name = encoder.encode(entry.name);
      const data = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
      if (!(data instanceof Uint8Array) || name.length > 65535) throw new Error('Invalid ZIP filename or contents.');
      const file = { name, data, crc: crc32(data), offset: localSize };
      localSize += 30 + name.length + data.length;
      centralSize += 46 + name.length;
      return file;
    });
    const totalSize = localSize + centralSize + 22;
    if (totalSize > 0xffffffff) throw new Error('ZIP64 is not supported.');
    const bytes = new Uint8Array(totalSize);
    const view = new DataView(bytes.buffer);
    let offset = 0;
    function u16(value) { view.setUint16(offset, value, true); offset += 2; }
    function u32(value) { view.setUint32(offset, value, true); offset += 4; }
    function write(data) { bytes.set(data, offset); offset += data.length; }
    for (const file of files) {
      u32(0x04034b50); u16(20); u16(0x0800); u16(0); u16(0); u16(33);
      u32(file.crc); u32(file.data.length); u32(file.data.length); u16(file.name.length); u16(0);
      write(file.name); write(file.data);
    }
    for (const file of files) {
      u32(0x02014b50); u16(20); u16(20); u16(0x0800); u16(0); u16(0); u16(33);
      u32(file.crc); u32(file.data.length); u32(file.data.length); u16(file.name.length);
      u16(0); u16(0); u16(0); u16(0); u32(0); u32(file.offset); write(file.name);
    }
    u32(0x06054b50); u16(0); u16(0); u16(files.length); u16(files.length); u32(centralSize); u32(localSize); u16(0);
    return bytes;
  }

  return Object.freeze({ buildMesh, makeSTL, makeOBJ, makeZip, gridSize, decodeGSI });
});
