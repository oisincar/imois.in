class Ball {
    constructor(offX, offY, offTime, func) {
        this.offX = offX;
        this.offY = offY;
        this.offTime = offTime;
        this.f = func;

        this.rad = 20;
    }

    draw(ctx, s) {
        // Draw ball
        ctx.beginPath();

        var s2 = (s + this.offTime) % 1;
        var pos = this.f(s2);
        var x = this.offX + pos[0];
        var y = this.offY - pos[1];

        ctx.arc(x, y, this.rad, 0, 2 * Math.PI, false);
        ctx.fillStyle = "#ef6461";
        ctx.fill();
    }
}
class BouncingBalls {

    constructor(id, demo_num, num_balls) {
        console.log("HELLOSONETUH");
        var canvas = document.getElementById(id);
        this.ctx = canvas.getContext('2d');
        this.w = canvas.width;
        this.h = canvas.height;
        this.balls = [];
        this.interval = 1/60; // 60 times a second

        this.state = 0;
        this.duration = 1;

        // 0 : _percAnim
        if (demo_num == 0) {
            var f = function(s) { return [ 0, s*200 ]; };
            this.balls.push(new Ball(canvas.width/2, canvas.height-50, 0, f));
        }
        // 1 : sin(..)
        if (demo_num == 1) {
            var f = function(s) { return [ 0, 100 * Math.sin(s * Math.PI * 2) ]; };
            this.balls.push(new Ball(canvas.width/2, canvas.height/2, 0, f));
        }
        // 2 : circle
        if (demo_num == 2) {
            var f = function(s) { return [ 100 * Math.cos(s * Math.PI * 2), 100 * Math.sin(s * Math.PI * 2) ]; };
            this.balls.push(new Ball(canvas.width/2, canvas.height/2, 0, f));
        }
        if (demo_num == 3) {
            var f = function(s) { var zz = Math.abs(2*s - 1);
                                  return [ 0, 200*(zz-0.5) ]; };
            this.balls.push(new Ball(canvas.width/2, canvas.height/2, 0, f));
        }
        if (demo_num == 4) {
            var f = function(s) {
                var zz = Math.abs(2*s - 1);
                return [ 0, 200*(0.5-zz*zz) ];
            };
            this.balls.push(new Ball(canvas.width/2, canvas.height/2, 0, f));
        }
        if (demo_num == 5) {
            var f = function(s) {
                var zz = Math.abs(2*s - 1);
                var zzc = Math.min(zz/0.8, 1);
                return [ 0, 200*(0.5-zzc*zzc) ];
            };
            this.balls.push(new Ball(canvas.width/2, canvas.height/2, 0, f));
        }
        else if (demo_num == 6) {

            var f = function(s) {
                var zz = Math.abs(2*s - 1);
                var zzc = Math.min(zz/0.8, 1);
                return [ 0, 200*(0.5-zzc*zzc) ];
            };

            console.log(num_balls);
            for (var i = 0; i < num_balls; i++) {
                this.balls.push(new Ball(100 + 20*i, canvas.height/2, i/num_balls, f));
            }
        }

        var self = this;
        setInterval(function() { self.draw(); }, self.interval*1000);
    }

    draw() {
        // Update state
        this.state = (this.state + this.interval/this.duration) % 1;

        // Draw bg
        var background_c = "#e0dfd5";

        var ctx = this.ctx;
        ctx.fillStyle = background_c;
        ctx.fillRect(0, 0, this.w, this.h);
        var s = this.state;
        this.balls.forEach(function(b) { b.draw(ctx, s) });
    }

}


