
class DistanceGraph {
    constructor(container, a1, a2, l1, l2, tx, ty) {
        // specify options
        var options = {
            width: '600px',
            height: '500px',
            xLabel: 'Shoulder',
            yLabel: 'Elbow',
            zLabel: 'Dist to Ball',
            legendLabel: 'Dist',
            style: 'surface',
            cameraPosition: {horizontal: 1.0, vertical: 1.0, distance: 1.7},
            // showPerspective: true,
            showPerspective: false,
            showGrid: true,
            showLegend: true,
            showShadow: false,
            keepAspectRatio: true,
            verticalRatio: 0.2,

            axisColor: '#e8e9eb',

            tooltip: function (point) {
            // parameter point contains properties x, y, z
                return '<div>Shoulder Angle: <b>' + Math.round(point.x) + '°</b></div>'
                    + '<div>Elbow Angle: <b>' + Math.round(point.y) + '°</b></div>'
                    + '<div>Distance to Ball: <b>' + point.z.toFixed(1) + 'm</b></div>';
            },

            xValueLabel: function(value) {
                return value + '°';
            },

            yValueLabel: function(value) {
                return value + '°';
            },

            zValueLabel: function(value) {
                return value + 'm';
            },
            showZAxis: false,
        };

        // create a graph3d
        var data = this.genData(a1, a2, l1, l2, tx, ty);

        this._graph = new vis.Graph3d(container, data, options);
    }

    // Distance to the goal with angles a and b, lengths l1, l2, and target tx, ty.
    distToTarget(a, b, l1, l2, tx, ty) {
        a *= deg2rad;
        b *= deg2rad;

        // Apply forward kinematics!
        // End point of first arm
        var x1 = l1 * Math.cos(a);
        var y1 = l1 * Math.sin(a);
        // Second arm
        var x2 = x1 + l2 * Math.cos(a + b);
        var y2 = y1 + l2 * Math.sin(a + b);

        return dist(tx,ty, x2,y2);
    }

    update(a1, a2, l1, l2, tx, ty) {
        this._graph.setData(this.genData(a1, a2, l1, l2, tx, ty));
    }

    genData(a1, a2, l1, l2, tx, ty) {
        // Create and populate a data table.
        var data = new vis.DataSet();

        var steps = 50; // Num steps sampled in x/y.

        for (var i = 0; i < steps; i++) {
            for (var j = 0; j < steps; j++) {
                // Centered around the current alpha and beta
                var ax = i/steps * 360 - 180 + a1,
                    ay = j/steps * 360 - 180 + a2;
                var value = this.distToTarget(ax, ay, l1, l2, tx, ty);

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
