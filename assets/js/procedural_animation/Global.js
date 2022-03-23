var deg2rad = Math.PI / 180;
var rad2deg = 180 / Math.PI;

function dist(x1, y1, x2, y2) {
    // dist to target
    return Math.sqrt((x1 - x2) * (x1 - x2) +
                     (y1 - y2) * (y1 - y2));
}
