
class TwoLinkArmAndGraph {

    constructor() {
        var self = this;

        function UpdateGraph() {
            self.graph.update(self.arm.getAngle(0),
                              self.arm.getAngle(1),
                              self.arm.getLength(0),
                              self.arm.getLength(1),
                              self.arm.getTargetX(),
                              self.arm.getTargetY());
        }

        // Create an arm in that space
        var armC = new ArmCanvas(document.getElementById('twolinkarmandgraph'), UpdateGraph);
        armC.targetX = 27;
        armC.targetY = 13;


        var arm = new Arm(2);
        armC.addArm(arm);

        this.arm = arm;
        this.graph = new DistanceGraph(document.getElementById('mygraph'),
                                       arm.getAngle(0),
                                       arm.getAngle(1),
                                       arm.getLength(0),
                                       arm.getLength(1),
                                       arm.getTargetX(),
                                       arm.getTargetY());

        // slider
        $("#ang1").slider({
            min: 0,
            max: 180,
            values: [arm.getAngle(0)],
            slide: function(event, ui) {
                $("#ang1val").text(ui.values[0] + "°")
                arm.setAngle(0, ui.values[0]);
                UpdateGraph();
            }
        });
        $("#ang1val").text(arm.getAngle(0) + "°");

        $("#ang2").slider({
            min: -160,
            max: 160,
            values: [arm.getAngle(1)],
            slide: function(event, ui) {
                $("#ang2val").text(ui.values[0] + "°");
                arm.setAngle(1, ui.values[0]);
                UpdateGraph();
            }
        });
        $("#ang2val").text(arm.getAngle(1) + "°");


        $("#l1").slider({
            min: 0,
            max: 15,
            step: 0.1,
            values: [arm.getLength(0)],
            slide: function(event, ui) {
                $("#l1val").text(ui.values[0] + "m");
                arm.setLength(0, ui.values[0]);
                UpdateGraph();
            }
        });
        $("#l1val").text(arm.getLength(0) + "m");

        $("#l2").slider({
            min: 0,
            max: 15,
            step: 0.1,
            values: [arm.getLength(1)],
            slide: function(event, ui) {
                $("#l2val").text(ui.values[0] + "m");
                arm.setLength(1, ui.values[0]);
                UpdateGraph();
            }
        });
        $("#l2val").text(arm.getLength(1) + "m");
    }
}

var a = new TwoLinkArmAndGraph();
