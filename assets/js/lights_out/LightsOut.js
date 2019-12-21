// Basic game.
class LightsOut {
    constructor(canvas, squaresX, squaresY) {
        this.canvas = canvas;
        this.squaresX = squaresX;
        this.squaresY = squaresY;

        var cell_colour = "#457b9d";

        this.lcanvas = new LightsCanvas(canvas, squaresX, squaresY, 400, cell_colour);

        // Store the state as a flat vector.
        this.state = new Array(squaresX*squaresY).fill(0);

        // Magic matrix to convert from state to visual result.
        this.convertMat = generateConversionMat(squaresX, squaresY);
        console.log(this.convertMat);

        // Setup events
        var self = this;
        var clickDnF = function(pos) {
            // Check if within bounds.
            console.log("Clicked!", pos);

            // Calculate touch pos
            var x = Math.floor(pos.x / self.lcanvas.squareDim);
            var y = Math.floor(pos.y / self.lcanvas.squareDim);

            // Toggle state.
            self.state[x + y*self.squaresX] ^= 1;
            // Redraw
            self.update();
        }
        var dragF = function(pos) {}
        var clickUpF = function(pos) {}

        addEvents(canvas, clickDnF, clickUpF, dragF);

        this.update();
    }

    update() {
        var squares = convertState(this.state, this.convertMat);
        this.lcanvas.draw(squares);
    }
}
