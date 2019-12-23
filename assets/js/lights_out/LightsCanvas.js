var background_colour = "#e0dfd5";
var light_line_colour = "#cac8b8";

// Draws a grid of squares.
class LightsCanvas {

    constructor(canvas, squaresX, squaresY, maxWidth, cellColour) {

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.squaresX = squaresX;
        this.squaresY = squaresY;
        this.cellColour = cellColour;

        // Size of each light
        this.squareDim = maxWidth / squaresX;

        canvas.width  = squaresX * this.squareDim;
        canvas.height = squaresY * this.squareDim;
    }

    draw(squares) {

        var ctx = this.ctx;

        // Clear...
        ctx.fillStyle = background_colour;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = light_line_colour;
        // Draw horizontal lines:
        for (var i = 0; i <= this.squaresY; i++) {
            var y = i * this.squareDim;
            ctx.moveTo(0,                 y);
            ctx.lineTo(this.canvas.width, y);
        }
        // Draw vertical lines:
        for (var i = 0; i <= this.squaresX; i++) {
            var x = i * this.squareDim;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
        }

        // Draw state squares.
        //console.log("hi");
        ctx.fillStyle = this.cellColour;
        for (var i = 0; i < this.squaresX; i++) {
            for (var j = 0; j < this.squaresY; j++) {
                var st = squares[i + j*this.squaresX];
                //console.log(st);
                if (st == 1) {
                    var sDim = this.squareDim;
                    var mg = 1; // Number of pixels between squares.
                    ctx.fillRect(i*sDim + mg, j*sDim + mg,
                                 sDim - 2*mg, sDim - 2*mg);
                }
            }
        }
        ctx.stroke();

        // Draw grid.
    }

}
