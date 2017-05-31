(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

function clone(point) { //TODO: use gl-vec2 for this
    return [point[0], point[1]]
}

function vec2(x, y) {
    return [x, y]
}

var _function = function createBezierBuilder(opt) {
    opt = opt||{};

    var RECURSION_LIMIT = typeof opt.recursion === 'number' ? opt.recursion : 8;
    var FLT_EPSILON = typeof opt.epsilon === 'number' ? opt.epsilon : 1.19209290e-7;
    var PATH_DISTANCE_EPSILON = typeof opt.pathEpsilon === 'number' ? opt.pathEpsilon : 1.0;

    var curve_angle_tolerance_epsilon = typeof opt.angleEpsilon === 'number' ? opt.angleEpsilon : 0.01;
    var m_angle_tolerance = opt.angleTolerance || 0;
    var m_cusp_limit = opt.cuspLimit || 0;

    return function bezierCurve(start, c1, c2, end, scale, points) {
        if (!points)
            points = [];

        scale = typeof scale === 'number' ? scale : 1.0;
        var distanceTolerance = PATH_DISTANCE_EPSILON / scale;
        distanceTolerance *= distanceTolerance;
        begin(start, c1, c2, end, points, distanceTolerance);
        return points
    }


    ////// Based on:
    ////// https://github.com/pelson/antigrain/blob/master/agg-2.4/src/agg_curves.cpp

    function begin(start, c1, c2, end, points, distanceTolerance) {
        points.push(clone(start));
        var x1 = start[0],
            y1 = start[1],
            x2 = c1[0],
            y2 = c1[1],
            x3 = c2[0],
            y3 = c2[1],
            x4 = end[0],
            y4 = end[1];
        recursive(x1, y1, x2, y2, x3, y3, x4, y4, points, distanceTolerance, 0);
        points.push(clone(end));
    }

    function recursive(x1, y1, x2, y2, x3, y3, x4, y4, points, distanceTolerance, level) {
        if(level > RECURSION_LIMIT) 
            return

        var pi = Math.PI;

        // Calculate all the mid-points of the line segments
        //----------------------
        var x12   = (x1 + x2) / 2;
        var y12   = (y1 + y2) / 2;
        var x23   = (x2 + x3) / 2;
        var y23   = (y2 + y3) / 2;
        var x34   = (x3 + x4) / 2;
        var y34   = (y3 + y4) / 2;
        var x123  = (x12 + x23) / 2;
        var y123  = (y12 + y23) / 2;
        var x234  = (x23 + x34) / 2;
        var y234  = (y23 + y34) / 2;
        var x1234 = (x123 + x234) / 2;
        var y1234 = (y123 + y234) / 2;

        if(level > 0) { // Enforce subdivision first time
            // Try to approximate the full cubic curve by a single straight line
            //------------------
            var dx = x4-x1;
            var dy = y4-y1;

            var d2 = Math.abs((x2 - x4) * dy - (y2 - y4) * dx);
            var d3 = Math.abs((x3 - x4) * dy - (y3 - y4) * dx);

            var da1, da2;

            if(d2 > FLT_EPSILON && d3 > FLT_EPSILON) {
                // Regular care
                //-----------------
                if((d2 + d3)*(d2 + d3) <= distanceTolerance * (dx*dx + dy*dy)) {
                    // If the curvature doesn't exceed the distanceTolerance value
                    // we tend to finish subdivisions.
                    //----------------------
                    if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                        points.push(vec2(x1234, y1234));
                        return
                    }

                    // Angle & Cusp Condition
                    //----------------------
                    var a23 = Math.atan2(y3 - y2, x3 - x2);
                    da1 = Math.abs(a23 - Math.atan2(y2 - y1, x2 - x1));
                    da2 = Math.abs(Math.atan2(y4 - y3, x4 - x3) - a23);
                    if(da1 >= pi) da1 = 2*pi - da1;
                    if(da2 >= pi) da2 = 2*pi - da2;

                    if(da1 + da2 < m_angle_tolerance) {
                        // Finally we can stop the recursion
                        //----------------------
                        points.push(vec2(x1234, y1234));
                        return
                    }

                    if(m_cusp_limit !== 0.0) {
                        if(da1 > m_cusp_limit) {
                            points.push(vec2(x2, y2));
                            return
                        }

                        if(da2 > m_cusp_limit) {
                            points.push(vec2(x3, y3));
                            return
                        }
                    }
                }
            }
            else {
                if(d2 > FLT_EPSILON) {
                    // p1,p3,p4 are collinear, p2 is considerable
                    //----------------------
                    if(d2 * d2 <= distanceTolerance * (dx*dx + dy*dy)) {
                        if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                            points.push(vec2(x1234, y1234));
                            return
                        }

                        // Angle Condition
                        //----------------------
                        da1 = Math.abs(Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y2 - y1, x2 - x1));
                        if(da1 >= pi) da1 = 2*pi - da1;

                        if(da1 < m_angle_tolerance) {
                            points.push(vec2(x2, y2));
                            points.push(vec2(x3, y3));
                            return
                        }

                        if(m_cusp_limit !== 0.0) {
                            if(da1 > m_cusp_limit) {
                                points.push(vec2(x2, y2));
                                return
                            }
                        }
                    }
                }
                else if(d3 > FLT_EPSILON) {
                    // p1,p2,p4 are collinear, p3 is considerable
                    //----------------------
                    if(d3 * d3 <= distanceTolerance * (dx*dx + dy*dy)) {
                        if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                            points.push(vec2(x1234, y1234));
                            return
                        }

                        // Angle Condition
                        //----------------------
                        da1 = Math.abs(Math.atan2(y4 - y3, x4 - x3) - Math.atan2(y3 - y2, x3 - x2));
                        if(da1 >= pi) da1 = 2*pi - da1;

                        if(da1 < m_angle_tolerance) {
                            points.push(vec2(x2, y2));
                            points.push(vec2(x3, y3));
                            return
                        }

                        if(m_cusp_limit !== 0.0) {
                            if(da1 > m_cusp_limit)
                            {
                                points.push(vec2(x3, y3));
                                return
                            }
                        }
                    }
                }
                else {
                    // Collinear case
                    //-----------------
                    dx = x1234 - (x1 + x4) / 2;
                    dy = y1234 - (y1 + y4) / 2;
                    if(dx*dx + dy*dy <= distanceTolerance) {
                        points.push(vec2(x1234, y1234));
                        return
                    }
                }
            }
        }

        // Continue subdivision
        //----------------------
        recursive(x1, y1, x12, y12, x123, y123, x1234, y1234, points, distanceTolerance, level + 1); 
        recursive(x1234, y1234, x234, y234, x34, y34, x4, y4, points, distanceTolerance, level + 1); 
    }
};

var index = _function();

function clone$1(point) { //TODO: use gl-vec2 for this
    return [point[0], point[1]]
}

function vec2$1(x, y) {
    return [x, y]
}

var _function$2 = function createQuadraticBuilder(opt) {
    opt = opt||{};

    var RECURSION_LIMIT = typeof opt.recursion === 'number' ? opt.recursion : 8;
    var FLT_EPSILON = typeof opt.epsilon === 'number' ? opt.epsilon : 1.19209290e-7;
    var PATH_DISTANCE_EPSILON = typeof opt.pathEpsilon === 'number' ? opt.pathEpsilon : 1.0;

    var curve_angle_tolerance_epsilon = typeof opt.angleEpsilon === 'number' ? opt.angleEpsilon : 0.01;
    var m_angle_tolerance = opt.angleTolerance || 0;

    return function quadraticCurve(start, c1, end, scale, points) {
        if (!points)
            points = [];

        scale = typeof scale === 'number' ? scale : 1.0;
        var distanceTolerance = PATH_DISTANCE_EPSILON / scale;
        distanceTolerance *= distanceTolerance;
        begin(start, c1, end, points, distanceTolerance);
        return points
    }

    ////// Based on:
    ////// https://github.com/pelson/antigrain/blob/master/agg-2.4/src/agg_curves.cpp

    function begin(start, c1, end, points, distanceTolerance) {
        points.push(clone$1(start));
        var x1 = start[0],
            y1 = start[1],
            x2 = c1[0],
            y2 = c1[1],
            x3 = end[0],
            y3 = end[1];
        recursive(x1, y1, x2, y2, x3, y3, points, distanceTolerance, 0);
        points.push(clone$1(end));
    }



    function recursive(x1, y1, x2, y2, x3, y3, points, distanceTolerance, level) {
        if(level > RECURSION_LIMIT) 
            return

        var pi = Math.PI;

        // Calculate all the mid-points of the line segments
        //----------------------
        var x12   = (x1 + x2) / 2;                
        var y12   = (y1 + y2) / 2;
        var x23   = (x2 + x3) / 2;
        var y23   = (y2 + y3) / 2;
        var x123  = (x12 + x23) / 2;
        var y123  = (y12 + y23) / 2;

        var dx = x3-x1;
        var dy = y3-y1;
        var d = Math.abs(((x2 - x3) * dy - (y2 - y3) * dx));

        if(d > FLT_EPSILON)
        { 
            // Regular care
            //-----------------
            if(d * d <= distanceTolerance * (dx*dx + dy*dy))
            {
                // If the curvature doesn't exceed the distance_tolerance value
                // we tend to finish subdivisions.
                //----------------------
                if(m_angle_tolerance < curve_angle_tolerance_epsilon)
                {
                    points.push(vec2$1(x123, y123));
                    return
                }

                // Angle & Cusp Condition
                //----------------------
                var da = Math.abs(Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y2 - y1, x2 - x1));
                if(da >= pi) da = 2*pi - da;

                if(da < m_angle_tolerance)
                {
                    // Finally we can stop the recursion
                    //----------------------
                    points.push(vec2$1(x123, y123));
                    return                 
                }
            }
        }
        else
        {
            // Collinear case
            //-----------------
            dx = x123 - (x1 + x3) / 2;
            dy = y123 - (y1 + y3) / 2;
            if(dx*dx + dy*dy <= distanceTolerance)
            {
                points.push(vec2$1(x123, y123));
                return
            }
        }

        // Continue subdivision
        //----------------------
        recursive(x1, y1, x12, y12, x123, y123, points, distanceTolerance, level + 1); 
        recursive(x123, y123, x23, y23, x3, y3, points, distanceTolerance, level + 1); 
    }
};

var index$1 = _function$2();

var pi = Math.PI;
var tau = 2 * pi;
var epsilon = 1e-6;
var tauEpsilon = tau - epsilon;

var types = {
  0: 'Point',
  1: 'LineString',
  2: 'Polygon'
};

function renderSimpleType (coords, i) {
  return {
    type: types[this._types[i]],
    coordinates: this._types[i] === 0 ? coords[0] : this._types[i] === 1 ? coords : [coords]
  }
}

function getType (types) {
  return types.reduce(function (acc, type) {
    return acc === type ? type : null
  })
}

function GeoJSONContext (scale) {
  this._scale = scale || 1;
  this._x0 = this._y0 = // start of current subpath
  this._x1 = this._y1 = null; // end of current subpath
  this._ = [];
  this._i = null;
  this._types = [];
}

function geoJSONContext (scale) {
  return new GeoJSONContext(scale)
}

GeoJSONContext.prototype = geoJSONContext.prototype = {
  constructor: GeoJSONContext,
  scale: function (_) {
    if (!arguments.length) return this._scale
    return this._scale = _, this
  },
  moveTo: function (x, y) {
    this._i = this._.push([[(this._x0 = this._x1 = +x), (this._y0 = this._y1 = +y)]]) - 1;
    this._types[this._i] = 1;
  },
  closePath: function () {
    if (this._x1 !== null) {
      this._types[this._i] = 2;
      this._[this._i].push([(this._x1 = this._x0), (this._y1 = this._y0)]);
    }
  },
  lineTo: function (x, y) {
    this._[this._i].push([(this._x1 = +x), (this._y1 = +y)]);
  },
  quadraticCurveTo: function (x1, y1, x, y) {
    var path = index$1([this._x1, this._y1], [+x1, +y1], [(this._x1 = +x), (this._y1 = +y)], this._scale);
    // The first point on the quadratic path is a dup of the last point in our stack
    // pop() is faster than shift() for large arrays, so instead of path.shift():
    this._[this._i].pop();
    Array.prototype.push.apply(this._[this._i], path);
  },
  bezierCurveTo: function (x1, y1, x2, y2, x, y) {
    var path = index([this._x1, this._y1], [+x1, +y1], [+x2, +y2], [(this._x1 = +x), (this._y1 = +y)], this._scale);
    this._[this._i].pop();
    Array.prototype.push.apply(this._[this._i], path);
  },
  rect: function (x, y, w, h) {
    this.types[this._i] = 1;
    this._i = this._.push([[(this._x0 = this._x1 = +x), (this._y0 = this._y1 = +y)], [+x + +w, +y], [+x + +w, +y + +h], [+x, +y]]);
  },
  arc: function (x, y, r, a0, a1, ccw) {
    // Is this a complete circle after a moveTo? Render as a Point
    if ((ccw ? a0 - a1 : a1 - a0) > tauEpsilon && this._[this._i].length === 1) {
      this._[this._i][0][0] = (this._x0 = this._x1 = +x);
      this._[this._i][0][1] = (this._y0 = this._y1 = +y);
      this._types[this._i] = 0;
    }
  },
  result: function () {
    if (this._.length === 0) return null
    if (this._.length === 1) {
      return renderSimpleType.call(this, this._[0], 0)
    }
    switch (getType(this._types)) {
      case 0:
        return {
          type: 'MultiPoint',
          coordinates: this._.map(function (c) { return c[0] })
        }
      case 1:
        return {
          type: 'MultiLineString',
          coordinates: this._
        }
      case 2:
        return {
          type: 'MultiPolygon',
          coordinates: this._.map(function (c) { return [c] })
        }
      default:
        return {
          type: 'GeometryCollection',
          geometries: this._.map(renderSimpleType, this)
        }
    }
  }
};

exports.geoJSONContext = geoJSONContext;

Object.defineProperty(exports, '__esModule', { value: true });

})));
