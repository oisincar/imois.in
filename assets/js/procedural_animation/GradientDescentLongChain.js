class GradientDescentLongChain {

    constructor(id) {
        var self = this;

        var armC = new ArmCanvas(
            document.getElementById(id),
            function(){self.finished = false;});

        this.arm = new Arm(20);
        this.arm2 = new Arm(100, 100, -50);


        armC.addArm(this.arm);
        armC.addArm(this.arm2);

        // Double arm length
        this.arm._lengths = this.arm._lengths.map(function(x) { return x*1.7; });
        this.arm2._angles = this.arm2._angles.map(function(x) { return 0; });
        // this.arm2._lengths = this.arm2._lengths.map(function(x) { return x*5; });
        this.arm.offX = 400;
        this.arm.offY = -350;

        var doUpdate = true;
        if (doUpdate)
            setInterval(function() { self.update(); }, self.interval);
    }

    improve(arm) {
        // Only do stuff if we're not already at the target.
        if (!this.finished) {
            // var grads = this.arm.calculateCurrentGradients();
            var grads = arm.calculateCurrentGradientsSq();

            // Update arm angles!
            for (var i = 0; i < grads.length; i++) {
                arm.changeAngle(i, -grads[i]*0.00001);
            }

            // If we're now close enough, don't update til we have to again.
            if (arm.getCurrentError() < 0.05) {
                // Tmp disable for multiple arms
                // this.finished = true;
            }
        }
    }

    // Bring 
    update() {
        this.improve(this.arm);
        this.improve(this.arm2);
    }

}

var b = new GradientDescentLongChain('multilink_arm_canvas');
