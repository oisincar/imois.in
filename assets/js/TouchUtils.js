
// Add click and touch events to a canvas. Automagically scales for x, y,
// handles touches and weird div shit.
// TODO: Eat scrolling event when touching the canvas - doesn't work properly.
function addEvents(canvas, clickDnF, clickUpF, dragF) {

    // Function gives the mouse coordinates after scaling.
    var gmp = function(canvas, evt) {
        var rect = canvas.getBoundingClientRect(), // abs. size of element
            scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
            scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

        return {
            x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
            y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
        }
    }

    canvas.addEventListener('mousedown', function(e) { clickDnF(gmp(canvas, e)); }, true);

    canvas.addEventListener('mousemove', function(e) { dragF(gmp(canvas, e)); }, true);

    canvas.addEventListener('mouseup', function(e) { clickUpF(gmp(canvas, e)); }, true);


    // Touch helpers!!
    canvas.addEventListener("touchstart", function (e) {
        var touch = e.touches[0];
        var mouseEvent = new MouseEvent("mousedown", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, false);
    canvas.addEventListener("touchend", function (e) {
        var mouseEvent = new MouseEvent("mouseup", {});
        canvas.dispatchEvent(mouseEvent);
    }, false);
    canvas.addEventListener("touchmove", function (e) {
        var touch = e.touches[0];
        var mouseEvent = new MouseEvent("mousemove", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, false);
    // Prevent scrolling when touching the canvas
    document.body.addEventListener("touchstart", function (e) {
        if (e.target == canvas) {
            e.preventDefault();
        }
    }, false);
    document.body.addEventListener("touchend", function (e) {
        if (e.target == canvas) {
            e.preventDefault();
        }
    }, false);
    document.body.addEventListener("touchmove", function (e) {
        if (e.target == canvas) {
            e.preventDefault();
        }
    }, false);

}
