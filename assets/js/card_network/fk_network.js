
$(document).ready(function() {
    is_anim = false;
    currentPos = 0;
    console_output = [""];

    // Toggle button on click
    var btn = $(".button-pp");
    btn.click(function() {
        is_anim = !is_anim;
        btn.toggleClass("paused");
        return false;
    });

    function update() {
        if (!is_anim) return;

        if (currentPos >= console_output.length) {
            is_anim = false;
            btn.toggleClass("paused");
            currentPos = 0;
            return;
        }
        $("#div1").text("> ./card_network" + console_output[currentPos]);
        currentPos++;
    }

    $.get("../../misc/card_network/out.txt", function(data){
        d2 = data.split("[9A");
        console_output = d2;
        console.log("Loaded!");
    });

    setInterval(function() { update(); }, 0.15);
});
