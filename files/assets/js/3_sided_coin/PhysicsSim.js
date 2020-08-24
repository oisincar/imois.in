// <script src="js/libs/three.min.js"></script>
// <script src="js/controls/OrbitControls.js"></script>
// <script src="../build/oimo.js"></script>

// </head>
// <body>
// <canvas id="canvas"></canvas>
// <div id='interface'>
//     <input type="button" value="demo" onClick=populate(1)>
//     <input type="number" name="quantity" min="10" max="2000" value="40"  id='MaxNumber'>
//     <input type="submit" onClick=populate()>
//     <input type="number" name="gravity" min="-20" max="20" value="-10" id='gravity' onChange=gravity() >
// </div>
// <div id='info'></div>
// <img style="position: absolute; top: 0; right: 0; border: 0;" src="assets/img/ribbon.png"></a>
// <a id="ribbon" href="https://github.com/lo-th/Oimo.js"></a>
// <script>
// demolink();

var isMobile = false;
var antialias = true;

// three var
var camera, scene, light, renderer, canvas;
var meshs = [];
var grounds = [];
var matBox, matCoin, matBoxSleep, matCoinSleep, matGround, matGroundTrans;
var buffgeoCoin, buffgeoBox;
var ToRad = 0.0174532925199432957;

// Countdowns to reset the coin after it's been static long enough...
var num_frame_to_reset = 50;
var counters = [];


// Size of the world in THREE units, centered at 0,0,0
var world_dim = 400
//
var num_coins_x = 0;
var num_coins_y = 0;
var num_coins = 0;


//oimo var
var world = null;
var collisionGroupes = {};
var bodys = null;
var type=1;

init();
loop();

function init() {

    var n = navigator.userAgent;
    if (n.match(/Android/i) || n.match(/webOS/i) || n.match(/iPhone/i) || n.match(/iPad/i) || n.match(/iPod/i) || n.match(/BlackBerry/i) || n.match(/Windows Phone/i)){ isMobile = true;  antialias = false; document.getElementById("MaxNumber").value = 200; }

    canvas = document.getElementById("physics-sim");

    // camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
    var w = (world_dim)/2;
    camera = new THREE.OrthographicCamera(-w, w, w, -w, 1, 10000 );
    camera.position.set( 0, 1000, 0 );
    camera.rotation.set( -Math.PI/2, 0, 0);

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ canvas:canvas, precision: "mediump", antialias:antialias });
    renderer.setSize( window.innerWidth, window.innerHeight );

    var materialType = 'MeshBasicMaterial';

    if(!isMobile){

        scene.add( new THREE.AmbientLight( 0x3D4143 ) );

        light = new THREE.DirectionalLight( 0xffffff , 1);
        light.position.set( 300, 1000, 500 );
        light.target.position.set( 0, 0, 0 );
        light.castShadow = true;
        var d = 300;
        light.shadow.camera = new THREE.OrthographicCamera( -d, d, d, -d,  500, 1600 );
        light.shadow.bias = 0.0001;
        light.shadow.mapSize.width = light.shadow.mapSize.height = 1024;
        scene.add( light );

        materialType = 'MeshPhongMaterial';

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;//THREE.BasicShadowMap;
    }

    // background
    // var buffgeoBack = new THREE.BufferGeometry();
    // buffgeoBack.fromGeometry( new THREE.IcosahedronGeometry(8000,1) );
    // var back = new THREE.Mesh( buffgeoBack, new THREE.MeshBasicMaterial( { map:gradTexture([[1,0.75,0.5,0.25], ['#1B1D1E','#3D4143','#72797D', '#b0babf']]), side:THREE.BackSide, depthWrite: false }  ));
    // back.geometry.applyMatrix(new THREE.Matrix4().makeRotationZ(15*ToRad));
    // scene.add( back );

    buffgeoCoin = new THREE.BufferGeometry();
    // buffgeoCoin.fromGeometry( new THREE.SphereGeometry( 1 , 20, 10 ) );
    buffgeoCoin.fromGeometry( new THREE.CylinderGeometry(1, 1, 1, 20) )

    buffgeoBox = new THREE.BufferGeometry();
    buffgeoBox.fromGeometry( new THREE.BoxGeometry( 1, 1, 1 ) );

    matCoin = new THREE[materialType]( { map: basicTexture(0), name:'sph' } );
    matBox = new THREE[materialType]( {  map: basicTexture(2), name:'box' } );
    matCoinSleep = new THREE[materialType]( { map: basicTexture(1), name:'ssph' } );
    matBoxSleep = new THREE[materialType]( {  map: basicTexture(3), name:'sbox' } );
    matGround = new THREE[materialType]( { color: 0x3D4143, transparent:true, opacity:0.5 } );
    matGroundTrans = new THREE[materialType]( { color: 0x3D4143, transparent:true, opacity:0.6 } );

    // events

    window.addEventListener( 'resize', onWindowResize, false );

    // physics

    initOimoPhysics();

}

function loop() {

    updateOimoPhysics();
    renderer.render( scene, camera );
    requestAnimationFrame( loop );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

}

function addStaticBox(size, position, rotation, spec) {
    var mesh;
    if(spec) mesh = new THREE.Mesh( buffgeoBox, matGroundTrans );
    else mesh = new THREE.Mesh( buffgeoBox, matGround );
    mesh.scale.set( size[0], size[1], size[2] );
    mesh.position.set( position[0], position[1], position[2] );
    mesh.rotation.set( rotation[0]*ToRad, rotation[1]*ToRad, rotation[2]*ToRad );
    scene.add( mesh );
    grounds.push(mesh);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
}

function clearMesh(){
    var i=meshs.length;
    while (i--) scene.remove(meshs[ i ]);
    i = grounds.length;
    while (i--) scene.remove(grounds[ i ]);
    grounds = [];
    meshs = [];
}

//----------------------------------
//  OIMO PHYSICS
//----------------------------------

function initOimoPhysics(){

    world = new OIMO.World( {info:true, worldscale:100} );
    populate();
    //setInterval(updateOimoPhysics, 1000/60);

}

function populate() {

    // The Bit of a collision group
    var group_ground = 1 << 0;  // 00000000 00000000 00000000 00000001
    var group_coin = 1 << 1;  // 00000000 00000000 00000000 00000010
    var group3 = 1 << 2;  // 00000000 00000000 00000000 00000100
    var all = 0xffffffff; // 11111111 11111111 11111111 11111111

    num_coins_x = document.getElementById("numCoinsX").value;
    num_coins_y = document.getElementById("numCoinsY").value;
    num_coins = num_coins_x*num_coins_y;
    counters = new Array(num_coins).fill(0);

    type = 3;

    // reset old
    clearMesh();
    world.clear();
    bodys = [];

    // Is all the physics setting for rigidbody
    var config = [
        1, // The density of the shape.
        0.4, // The coefficient of friction of the shape.
        0.35, // The coefficient of restitution of the shape.
        group_ground, // The bits of the collision groups to which the shape belongs.
        0xffffffff // The bits of the collision groups with which the shape collides.
    ];

    //add ground
    var ground = world.add({size:[world_dim*2, 40, world_dim*2], pos:[0,-20,0], config:config});
    addStaticBox([world_dim*2, 40, world_dim*2], [0,-20,0], [0,0,0]);

    config[3] = group_coin;
    config[4] = all & ~group_coin; // All except other coins
    // var ground3 = world.add({size:[5, 100, 390], pos:[0,40,0], rot:[0,0,0], config:config});
    // addStaticBox([5, 100, 390], [0,40,0], [0,0,0], true);

    // now add object
    var x, y, z, w, h, d;

    for (i = 0; i < num_coins; i++) {
        if(type===3) t = Math.floor(Math.random()*2)+1;
        else t = type;

        // var coin_sp_x = world_dim/num_coins_x;
        // var coin_sp_z = world_dim/num_coins_y;

        x = 0; y = -100; z = 0;

        r = 15
        d = 8

        bodys[i] = world.add({type:'cylinder', size:[r,d,r], pos:[x,y,z], move:true, config:config });
        meshs[i] = new THREE.Mesh( buffgeoCoin, matCoin );
        meshs[i].scale.set( r, d, r);

        meshs[i].castShadow = true;
        meshs[i].receiveShadow = true;

        scene.add( meshs[i] );
    }
}



function updateOimoPhysics() {

    if(world == null) return;

    world.step();

    var p, r, m, x, y, z;
    var mtx = new THREE.Matrix4();
    var i = bodys.length;
    var mesh;
    var body;

    while (i--){
        body = bodys[i];
        mesh = meshs[i];


        if (body.sleeping) {
            counters[i] += 1;
            // TODO: Update mesh based on type...
            if(mesh.material.name !== 'ssph') mesh.material = matCoinSleep;
        }

        // Reset if it fell off, or has rested long enough.
        if((body.sleeping && counters[i] > num_frame_to_reset) || mesh.position.y < -100){
            counters[i] = 0;

            if (body.sleeping) {
                // TODO: count results!
                console.log(body.getAxis());
            }



            var coin_sp_x = world_dim/num_coins_x;
            var coin_sp_z = world_dim/num_coins_y;

            x = ((i % num_coins_x) + 0.5 - num_coins_x/2) * coin_sp_x;
            y = 100 // Drop height
            z = (Math.floor(i / num_coins_x) + 0.5 - num_coins_y/2) * coin_sp_z;

            body.resetPosition(x,y,z);

            // Random rot...
            body.resetRotation(Math.random()*360,
                               Math.random()*360,
                               Math.random()*360);

            // Add rotational impulse
            var rot_imp = 10
            body.angularVelocity.set((Math.random()-0.5)*2*rot_imp,
                                     (Math.random()-0.5)*2*rot_imp,
                                     (Math.random()-0.5)*2*rot_imp);
            console.log(body.angularVelocity);
        }

        if(!body.sleeping){

            // Apply angular drag!
            var v = body.angularVelocity;
            var drag = 0.993;
            body.angularVelocity.set(
                v.x*drag,
                v.y*drag,
                v.z*drag
            );


            mesh.position.copy(body.getPosition());
            mesh.quaternion.copy(body.getQuaternion());

            // change material
            if(mesh.material.name === 'ssph') mesh.material = matCoin;
        }
    }

    // infos.innerHTML = world.getInfo();
}

function gravity(g){
    nG = document.getElementById("gravity").value
    world.gravity = new OIMO.Vec3(0, nG, 0);
}

//----------------------------------
//  TEXTURES
//----------------------------------

function gradTexture(color) {
    var c = document.createElement("canvas");
    var ct = c.getContext("2d");
    c.width = 16; c.height = 256;
    var gradient = ct.createLinearGradient(0,0,0,256);
    var i = color[0].length;
    while(i--){ gradient.addColorStop(color[0][i],color[1][i]); }
    ct.fillStyle = gradient;
    ct.fillRect(0,0,16,256);
    var texture = new THREE.Texture(c);
    texture.needsUpdate = true;
    return texture;
}

function basicTexture(n){

    var canvas = document.createElement( 'canvas' );
    canvas.width = canvas.height = 64;
    var ctx = canvas.getContext( '2d' );
    var colors = [];
    if(n===0){ // sphere
        colors[0] = "#383838";
        colors[1] = "#38AA80";
    }
    if(n===1){ // sphere sleep
        colors[0] = "#58AA80";
        colors[1] = "#58FFAA";
    }
    if(n===2){ // box
        colors[0] = "#AA8058";
        colors[1] = "#FFAA58";
    }
    if(n===3){ // box sleep
        colors[0] = "#383838";
        colors[1] = "#AA8038";
    }
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = colors[1];
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillRect(32, 32, 32, 32);

    var tx = new THREE.Texture(canvas);
    tx.needsUpdate = true;
    return tx;
}
