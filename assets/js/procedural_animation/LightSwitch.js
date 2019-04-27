class FlickerAnim {

    constructor(id) {
        var canvas = document.getElementById(id);
        this.w = canvas.width;
        this.h = canvas.height;
        this.ctx = canvas.getContext('2d');

        this.on = false;

        var self = this;
        setInterval(function() {
            self.draw();
        }, self.interval);
    }



    draw() {
        var ctx = this.ctx;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, this.w, this.h);

        // UPDATE state
        if (this.on && Math.random() > 0.98) {
            this.on = false;
        } else if (!this.on && Math.random() > 0.93) {
            this.on = true;
        }


        // draw shape
        if (this.on) {
            var x = Math.round(this.w / 2);
            var y = Math.round(this.h / 2);
            var r = 60;

            var radgrad = ctx.createRadialGradient(x, y, 0, x, y, r);
            radgrad.addColorStop(0,   'rgba(244,235,66,1)');
            radgrad.addColorStop(0.4, 'rgba(244,235,66,.5)');
            radgrad.addColorStop(1,   'rgba(244,235,66,0)');

            ctx.fillStyle = radgrad;
            ctx.fillRect(0, 0, this.w, this.h);
        }
    }

}
var z = new FlickerAnim('lightswitch');
