// colours
var background_colour = "#e0dfd5";
var arm_colour = "#457b9d";
var ball_colour = "#ef6461";
var ball_stroke_colour = "#ef6461";
var light_line_colour = "#cac8b8";

class ArmCanvas {

    addArm(arm) {
        this._arms.push(arm);
        arm._setParent(this);
    }

    constructor(canvas, ballmove_callback) {

        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
        this.ctx = canvas.getContext('2d');

        this.ballmove_callback = ballmove_callback;

        this._arms = [];

        this.targetX = 10;
        this.targetY = 10;
        // target radius
        this.targetR = 10;

        this.sf = 12; // Scaling from 'units' to pixels.

        // moving the ball!
        var self = this;
        var isClicked = false;

        canvas.addEventListener('mousedown', function(e) {
            isClicked = true;
        }, true);

        canvas.addEventListener('mousemove', function(e) {
            if (isClicked) {
                self.targetX = (e.offsetX              ) / self.sf;
                self.targetY = (self.height - e.offsetY) / self.sf;

                // Update the graph/ whatever else should the ball move.
                ballmove_callback();
                // redraw self
                self._valid = false;
            }
        }, true);

        canvas.addEventListener('mouseup', function(e) {
            isClicked = false;
        }, true);

        setInterval(function() { self.draw(); }, self.interval);
    }

    draw() {
        // if our state is invalid, redraw and validate!
        if (!this._valid) {
            this._valid = true;

            var ctx = this.ctx;

            // Colour background!
            ctx.fillStyle = background_colour;
            ctx.fillRect(0, 0, this.width, this.height);

            // Draw grid!
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = light_line_colour;

            // First lines are here.
            // Ensure grid is evenly spaced on the surface.
            var ox = (this.width/2)  % this.sf - this.sf;
            var oy = (this.height/2) % this.sf - this.sf;

            while (ox < this.width) {
                ox += this.sf;

                ctx.moveTo(ox, 0);
                ctx.lineTo(ox, this.height);
            }
            while (oy < this.height) {
                oy += this.sf;

                ctx.moveTo(0,          oy);
                ctx.lineTo(this.width, oy);
            }

            ctx.stroke();

            // Draw ball
            ctx.beginPath();
            ctx.arc(this.targetX * this.sf,
                    this.height - this.targetY*this.sf, this.targetR, 0, 2 * Math.PI, false);
            ctx.fillStyle = ball_colour;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = ball_stroke_colour;
            ctx.stroke();

            this._arms.forEach(function(a) {
                a.draw(ctx);
            });
        }
    }

}
