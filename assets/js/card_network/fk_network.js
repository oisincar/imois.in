is_anim = false;
currentPos = 0;

console_output = [""];

function update() {
    if (!is_anim) return;

    if (currentPos >= console_output.length) {
        is_anim = false;
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


$("button").click(function(){
    console.log("Clicked")

    var loc = window.location.pathname;
    var dir = loc.substring(0, loc.lastIndexOf('/'));
    console.log(loc);
    console.log(dir);

    is_anim = true;
    currentPos = 0;
});

setInterval(function() { update(); }, 0.15);
