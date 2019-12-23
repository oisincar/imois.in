// Basic game.
class LightsOut {
    constructor(canvas, squaresX, squaresY, maxwidth=400, parity=false) {
        this.canvas = canvas;
        this.squaresX = squaresX;
        this.squaresY = squaresY;

        // Flip a single tile to troll.
        this.parity = parity;

        var cell_colour = "#457b9d";

        this.lcanvas = new LightsCanvas(canvas, squaresX, squaresY, maxwidth, cell_colour);

        // Store the state as a flat vector.
        this.state = new Array(squaresX*squaresY).fill(0);
        this.squares = new Array(squaresX*squaresY).fill(0);

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
            self.click(x,y);
        }
        var dragF = function(pos) {}
        var clickUpF = function(pos) {}

        addEvents(canvas, clickDnF, clickUpF, dragF);

        this.update();
    }

    click(x, y) {
        this.state[x + y*this.squaresX] ^= 1;
        // Redraw
        this.update();
    }

    update() {
        this.squares = convertState(this.state, this.convertMat);

        // Flip the first tile.
        if (this.parity)
            this.squares[0] ^= 1;

        this.lcanvas.draw(this.squares);
    }

    randomize() {
        this.state = Array.from({length: this.squaresX * this.squaresY},
                                () => Math.floor(Math.random() * 2));
        this.update();
    }

}
