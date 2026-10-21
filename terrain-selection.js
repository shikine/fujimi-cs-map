(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TerrainSelection = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const R = 6378137;
  const RAD = Math.PI / 180;

  function finite(value, name) {
    if (!Number.isFinite(value)) throw new Error(name + ' must be finite.');
    return value;
  }

  function normalize(angle) {
    finite(angle, 'angleDegrees');
    return ((angle % 360) + 360) % 360;
  }

  function validate(selection) {
    if (!selection) throw new Error('A selection is required.');
    for (const key of ['centerX', 'centerY', 'widthProjected', 'heightProjected', 'angleDegrees']) {
      finite(selection[key], key);
    }
    if (selection.widthProjected < 0 || selection.heightProjected < 0) {
      throw new Error('Selection dimensions must be nonnegative.');
    }
    return selection;
  }

  function project(coordinate) {
    const lat = finite(coordinate.lat, 'lat');
    const lon = finite(coordinate.lon, 'lon');
    if (lat <= -90 || lat >= 90) throw new Error('Latitude must be between -90 and 90 degrees.');
    return { x: R * lon * RAD, y: R * Math.log(Math.tan(Math.PI / 4 + lat * RAD / 2)) };
  }

  function unproject(coordinate) {
    const x = finite(coordinate.x, 'x');
    const y = finite(coordinate.y, 'y');
    return { lat: Math.atan(Math.sinh(y / R)) / RAD, lon: x / R / RAD };
  }

  function fromBounds(bounds) {
    const southwest = project({ lat: bounds.south, lon: bounds.west });
    const northeast = project({ lat: bounds.north, lon: bounds.east });
    if (bounds.north < bounds.south || bounds.east < bounds.west) {
      throw new Error('Bounds must be ordered south to north and west to east.');
    }
    return {
      centerX: (southwest.x + northeast.x) / 2,
      centerY: (southwest.y + northeast.y) / 2,
      widthProjected: northeast.x - southwest.x,
      heightProjected: northeast.y - southwest.y,
      angleDegrees: 0
    };
  }

  // u increases along model +X; v increases down the model, opposite to model +Y.
  function point(selection, u, v) {
    validate(selection);
    finite(u, 'u'); finite(v, 'v');
    const angle = normalize(selection.angleDegrees) * RAD;
    const localX = (u - 0.5) * selection.widthProjected;
    const localY = (0.5 - v) * selection.heightProjected;
    const x = selection.centerX + localX * Math.cos(angle) + localY * Math.sin(angle);
    const y = selection.centerY - localX * Math.sin(angle) + localY * Math.cos(angle);
    return { x, y, ...unproject({ x, y }) };
  }

  function corners(selection) {
    return [point(selection, 0, 0), point(selection, 1, 0), point(selection, 1, 1), point(selection, 0, 1)];
  }

  function bounds(selection) {
    const points = corners(selection);
    return {
      south: Math.min(...points.map(p => p.lat)),
      west: Math.min(...points.map(p => p.lon)),
      north: Math.max(...points.map(p => p.lat)),
      east: Math.max(...points.map(p => p.lon))
    };
  }

  function dimensions(selection) {
    validate(selection);
    const { lat } = unproject({ x: selection.centerX, y: selection.centerY });
    const cos = Math.cos(lat * RAD);
    return { widthMetres: selection.widthProjected * cos, heightMetres: selection.heightProjected * cos, lat, cos };
  }

  function rotate(selection, angle) {
    validate(selection);
    return { ...selection, angleDegrees: normalize(angle) };
  }

  // Keep the opposite corner fixed, including when the moving corner crosses it.
  function resize(selection, index, coordinate) {
    validate(selection);
    if (!Number.isInteger(index) || index < 0 || index > 3) throw new Error('Corner index must be from 0 to 3.');
    const x = finite(coordinate.x, 'x');
    const y = finite(coordinate.y, 'y');
    const fixed = corners(selection)[(index + 2) % 4];
    const angle = normalize(selection.angleDegrees) * RAD;
    const dx = x - fixed.x, dy = y - fixed.y;
    return {
      centerX: (x + fixed.x) / 2,
      centerY: (y + fixed.y) / 2,
      widthProjected: Math.abs(dx * Math.cos(angle) - dy * Math.sin(angle)),
      heightProjected: Math.abs(dx * Math.sin(angle) + dy * Math.cos(angle)),
      angleDegrees: normalize(selection.angleDegrees)
    };
  }

  function bearing(selection, coordinate) {
    validate(selection);
    const dx = finite(coordinate.x, 'x') - selection.centerX;
    const dy = finite(coordinate.y, 'y') - selection.centerY;
    // At the center no bearing exists: retain the current orientation.
    return dx === 0 && dy === 0 ? normalize(selection.angleDegrees) : normalize(Math.atan2(dx, dy) / RAD);
  }

  return { fromBounds, point, corners, bounds, dimensions, rotate, resize, bearing, project, unproject };
});
