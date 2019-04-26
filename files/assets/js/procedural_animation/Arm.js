class Arm {
    getAngle(ix) { return Math.round(this._angles[ix] * rad2deg); }
    setAngle(ix, degrees) {
        this._angles[ix] = degrees * deg2rad;
        this.armCanvas._valid = false;
    }

    getLength(ix) { return this._lengths[ix]; }
    setLength(ix, len) {
        this._lengths[ix] = len;
        this.armCanvas._valid = false;
    }

    changeAngle(ix, dval) {
        this._angles[ix] += dval;
        this.armCanvas._valid = false;
    }

    _setParent(armCanvas) {
        this.armCanvas = armCanvas;
        // Should probably pull these upon render but eh.
        this.height = armCanvas.height;
        this.width  = armCanvas.width;
        this.sf     = armCanvas.sf;
    }

    getTargetX() { return this.armCanvas.targetX - this.offX/this.sf; }
    getTargetY() { return this.armCanvas.targetY + this.offY/this.sf; }

    constructor(num_segments, x=200, y=-50, ang=0) {
        // **** First some setup! ****
        this.num_segments = num_segments;

        // Graphical offsets
        this.offX = x;
        this.offY = y;
        this.offA = ang * deg2rad;

        // Create default angles/ lengths (0.999 as a lazy to avoid divide by 0 when one link)
        var stAng = 80; var incAng = ((-60) - stAng) / (num_segments-1);
        this._angles  = Array.from({length: num_segments}, (v, k) => (stAng + (incAng*k || 0)) * deg2rad);
        this._angles[0] += this.offA; // Offset from vertical.

        var stLen = 20/num_segments; var incLen = (15/num_segments - stLen) / (num_segments-1);
        this._lengths = Array.from({length: num_segments}, (v, k) => stLen + (k*incLen || 0));
    }

    // Return tuples of (x, y) at the end of each limb.
    calculatePositions(angles, lengths) {
        // Arm
        var curX = 0,
            curY = 0,
            curA = 0;

        var res = [];

        // Calculating end positions for each segment of the arm, and drawing to there.
        for (var i = 0; i < this.num_segments; i++) {
            var l = lengths[i];

            curA += angles[i];
            curX += l * Math.cos(curA);
            curY += l * Math.sin(curA);

            res.push([curX, curY]);
        }

        return res;
    }

    getCurrentError() {
        return this.getError(this._angles, this._lengths, this.getTargetX(), this.getTargetY());
    }
    getError(angles, lengths, tx, ty) {
        var poss = this.calculatePositions(angles, lengths);
        return dist(poss[angles.length-1][0], poss[angles.length-1][1], tx, ty);
    }

    calculateCurrentGradients() {
        return this.calculateGradients(this._angles, this._lengths, this.getTargetX(), this.getTargetY());
    }
    calculateGradients(angles, lengths, tx, ty) {
        // Evaluating error of regular function. Not derived.
        // This is the same for all sub-arms.
        var err = this.getError(angles, lengths, tx, ty);
        var grads = this.calculateGradientSquared(angles, lengths, tx, ty);

        // Chain rule... Kinda. With square root -> 1/sqrt -> this (/2/err).
        for (var i = 0; i < grads.length; i++)
            grads[i] /= 2*err;

        return grads;
    }

    calculateCurrentGradientsSq() {
        return this.calculateGradientSquared(this._angles, this._lengths, this.getTargetX(), this.getTargetY());
    }
    calculateGradientSquared(angles, lengths, tx, ty) {
        var grads = [];
        var as = angles.slice();
        var ls = lengths.slice();

        for (var i = 0; i < angles.length; i++) {
            grads.push(this.calculateGradSquared(as, ls, tx, ty));

            // Update 'base' position of arm, by moving target closer.
            // We can consider the arm as if it was one link shorter, ignoring previous angles.
            tx -= ls[0]*Math.cos(as[0]);
            ty -= ls[0]*Math.sin(as[0]);

            // Add previous (sum of) angles to the first one. Previous rotation adds here.
            if (as.length >= 1)
                as[1] += as[0];

            // Drop first element.
            as.shift();
            ls.shift();
        }

        return grads;
    }

    // Returns the derivitive of the squared error.
    calculateGradSquared(angles, lengths, tx, ty) {
        var sumGradX = 0;
        var sumGradY = 0;
        var sumA = 0;

        // d/da =
        //    +2i * ( w sin(a + b + c + d)
        //          + z sin(a + b + c)
        //          + y sin(a + b)
        //          + x sin(a))
        //    -2j * ( w cos(a + b + c + d)
        //          + z cos(a + b + c)
        //          + y cos(a + b)
        //          + x cos(a))

        // For debugging, write the equation we have.
        // var eqGradX = "";
        // var eqGradY = "";
        // var asStr = "";

        for (var i = 0; i < angles.length; i++) {
            sumA     += angles[i];
            sumGradX += lengths[i] * Math.sin(sumA); // sin/cos flipped here cause it's the derivitive.
            sumGradY += lengths[i] * Math.cos(sumA);

            // asStr   += " + a" + i;
            // eqGradX += " + l" + i + "*sin(" + asStr + ")";
            // eqGradY += " + l" + i + "*cos(" + asStr + ")";
        }

        // Times it by tx, ty.
        var g = tx * 2 * sumGradX
               -ty * 2 * sumGradY;

        // var eq = "2i * (" + eqGradX + ") " +
        //         "-2j * (" + eqGradY + ")";

        return g;
    }

    // While draw is called as often as the INTERVAL variable demands,
    // It only ever does something if the canvas gets invalidated by our code
    draw(ctx) {
        // Draw arm
        ctx.beginPath();

        // Base
        var w = 30;
        ctx.moveTo(this.offX - w*Math.cos(this.offA),
                   this.offY + w*Math.sin(this.offA) + this.height);
        ctx.lineTo(this.offX + w*Math.cos(this.offA),
                   this.offY - w*Math.sin(this.offA) + this.height);

        // Arm
        ctx.lineWidth = 7;
        ctx.strokeStyle = arm_colour;
        ctx.moveTo(this.offX, this.offY + this.height);

        self = this;
        this.calculatePositions(this._angles, this._lengths).forEach(function(pos) {
            ctx.lineTo(self.offX + pos[0]*self.sf,
                        self.offY + self.height - pos[1]*self.sf);
        });

        ctx.stroke();
    }
}
