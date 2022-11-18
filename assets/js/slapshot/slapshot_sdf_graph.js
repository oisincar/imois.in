// Uses vectors from ../math/Vector.js


function clamp01(n) {
    return Math.min(Math.max(n, 0), 1);
}

function sdfEvenCapsule(point, center1, center2, radius) {
    var p1 = point.subtract(center1),
        centerDist = center2.subtract(center1);

    var h = clamp01(p1.dot(centerDist) / centerDist.getSqrMagnitude());
    return (p1.subtract(centerDist.multiply(h))).getMagnitude() - radius;
}

function distanceToEdgeOfRink(point, includeGoals=true) {
    // See: https:iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
    // Point in the 'positive' space
    var p = point.abs();

    // Object of radius r traces a smaller box within the regular box...
    // Box dimensions/2
    var dim = new Vector(49.2, 77.25);
    var cornerRad = new Vector(22.51, 22.51);

    var q = p.subtract(dim).add(cornerRad);
    // Negate cause inside...
    // Distance to the boards
    var dist = - (Math.min(Math.max(q.x, q.y), 0)
                  + q.max(new Vector()).getMagnitude()
                  - cornerRad.x);

    dist = Math.min(dist, DistanceToNearestGoal(point));
    return dist;
}

function DistanceToNearestGoal(point) {
    // Uses the pitch being symmetrical to do both goals at once.

    // Treat the point as being in positive Y space. If it's not, just look at the symmetrically
    // opposite goal.
    if (point.y < 0)
        point.y = -point.y;

    // Positions of the centers of capsules
    // Center of the goal's a bit forward, which makes the capsule fit better
    var GOAL_COLLIDER_OFFSET = 0.4;
    // Distance from  the center to the back of the goal
    var radius = (64.3 - 58.5)*0.5 + GOAL_COLLIDER_OFFSET;
    var centerY = 58.5 + (64.3 - 58.5)*0.5 - GOAL_COLLIDER_OFFSET;
    var circleXOffset = 15.7*0.5 - radius;
    var p1 = new Vector(circleXOffset, centerY);
    var p2 = new Vector(-circleXOffset, centerY);

    return sdfEvenCapsule(point, p1, p2, radius);
}







class SDFGraph {
    constructor(container, distance_fn, range_x, range_y, steps) {
        // specify options
        var options = {
            width: 'inherit',
            height: '500px',
            xLabel: 'X axis',
            yLabel: 'Y axis',
            zLabel: 'Distance to Surface',
            legendLabel: 'Dist',
            style: 'surface',
            cameraPosition: {horizontal: 1.0, vertical: 1.0, distance: 1.7},
            // showPerspective: true,
            showPerspective: false,
            showGrid: true,
            showLegend: true,
            showShadow: false,
            keepAspectRatio: true,
            verticalRatio: 0.7,

            // axisColor: '#e8e9eb',

            tooltip: function (point) {
            // parameter point contains properties x, y, z
                return '<div>X: <b>' + point.x.toFixed(1) + '</b></div>'
                     + '<div>Y: <b>' + point.y.toFixed(1) + '</b></div>'
                     + '<div>Distance to surface: <b>' + point.z.toFixed(1) + '</b></div>';
            },

            xValueLabel: function(value) {
                return value + '';
            },

            yValueLabel: function(value) {
                return value + '';
            },

            zValueLabel: function(value) {
                return value + '';
            },
            showZAxis: true,
        };

        // create a graph3d
        var data = this.genData(distance_fn, range_x, range_y, steps);

        this._graph = new vis.Graph3d(container, data, options);

        window.onresize = function() {
            var x = window.innerWidth * 0.8;
            $('.graph-div').height(x+"px");
        };
    }

    // update(a1, a2, l1, l2, tx, ty) {
    //     this._graph.setData(this.genData(a1, a2, l1, l2, tx, ty));
    // }

    genData(distance_fn, range_x, range_y, steps) {
        var data = new vis.DataSet();

        for (var i = 0; i < steps; i++) {
            for (var j = 0; j < steps; j++) {
                // Centered around the current alpha and beta
                var ax = (i/(steps-1) - 0.5) * range_x,
                    ay = (j/(steps-1) - 0.5) * range_y;

                var value = distance_fn(ax, ay);

                data.add({
                    x: ax,
                    y: ay,
                    z: value,
                    style: value
                });
            }
        }
        return data;
    }
}
