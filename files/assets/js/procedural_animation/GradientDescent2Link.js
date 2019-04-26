class GradientDescent2Link {

    constructor(id, num_segments) {
        var self = this;

        var armC = new ArmCanvas(
            document.getElementById(id),
            function(){self.finished = false;});

        this.arm = new Arm(num_segments);

        armC.addArm(this.arm);

        // Double arm length
        // this.arm._lengths = this.arm._lengths.map(function(x) { return x*1.7; });

        setInterval(function() { self.update(); }, self.interval);
    }

    improve(arm) {
        // Only do stuff if we're not already at the target.
        if (!this.finished) {
            // var grads = this.arm.calculateCurrentGradients();
            var grads = arm.calculateCurrentGradientsSq();

            // Update arm angles!
            for (var i = 0; i < grads.length; i++) {
                arm.changeAngle(i, -grads[i]*0.0001);
            }

            // If we're now close enough, don't update til we have to again.
            if (arm.getCurrentError() < 0.05) {
                this.finished = true;
            }
        }
    }

    update() {
        this.improve(this.arm);
    }

}


