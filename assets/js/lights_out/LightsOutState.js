// Show the game as well as it's internal state.
class LightsOutState {
    constructor(stateCanvas, gameCanvas, squaresX, squaresY) {
        this.squaresX = squaresX;
        this.squaresY = squaresY;

        var state_colour = "#eb4034";
        var cell_colour = "#457b9d";

        this.stateCanvas = new LightsCanvas(stateCanvas, squaresX, squaresY, 400, state_colour);
        this.gameCanvas = new LightsCanvas(gameCanvas, squaresX, squaresY, 400, cell_colour);

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

            // Calculate touch pos (both canvases the same size soo...)
            var x = Math.floor(pos.x / self.stateCanvas.squareDim);
            var y = Math.floor(pos.y / self.stateCanvas.squareDim);

            // Toggle state.
            self.state[x + y*self.squaresX] ^= 1;
            // Redraw
            self.update();
        }
        var dragF = function(pos) {}
        var clickUpF = function(pos) {}

        // Literally the same events for both canvases!!
        addEvents(stateCanvas, clickDnF, clickUpF, dragF);
        addEvents(gameCanvas, clickDnF, clickUpF, dragF);

        this.update();
    }

    update() {
        var squares = convertState(this.state, this.convertMat);
        this.stateCanvas.draw(this.state);
        this.gameCanvas.draw(squares);
    }
}
