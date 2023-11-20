import {
    flatten,
    initFileShaders,
    lookAt,
    mat4,
    perspective,
    rotateX,
    rotateY, rotateZ, scalem,
    translate,
    vec2,
    vec4
} from "./helperfunctions.js";

let gl:WebGLRenderingContext;
let program:WebGLProgram;
let canvas:HTMLCanvasElement;

//interaction and rotation state
let xAngle:number;
let yAngle:number;
let mouse_button_down:boolean = false;
let prevMouseX:number = 0;
let prevMouseY:number = 0;
let zoom:number = 25;

let earthRotation:number = 0;
let cloudRotation:number = 0;

let vPosition:GLint;
let vNormal:GLint;
let vTangent:GLint;
let vTexCoord:GLint;

let ucolormapsampler:WebGLUniformLocation;//this will be a pointer to our sampler2D
let unormalmapsampler:WebGLUniformLocation;
let ucloudmapsampler:WebGLUniformLocation;
let unightmapsampler:WebGLUniformLocation;
let uspecularmapsampler:WebGLUniformLocation;
let uLightPosition:WebGLUniformLocation;
let uAmbienLight:WebGLUniformLocation;
let uLightColor:WebGLUniformLocation;
let uIsCloud:WebGLUniformLocation;
let uMode:WebGLUniformLocation;


//uniform locations
let umv:WebGLUniformLocation; //uniform for mv matrix
let uproj:WebGLUniformLocation; //uniform for projection matrix
//matrices
let mv:mat4; //local mv
let p:mat4; //local projection

// total number of vertices to render
let numVerts:number;

let earthTex:WebGLTexture;
let cloudTex:WebGLTexture;
let nightTex:WebGLTexture;
let normalTex:WebGLTexture;
let specTex:WebGLTexture;

let earthImage:HTMLImageElement;
let cloudImage:HTMLImageElement;
let nightImage:HTMLImageElement;
let normalImage:HTMLImageElement;
let specImage:HTMLImageElement;

let MODE_COLOR = 1;
let MODE_CLOUD = 2;
let MODE_NIGHT = 3;
let MODE_NORMAL = 4;
let MODE_SPEC = 5;
let MODE_ALL = 6;
let currentMode = 1;

let modeButtons:HTMLButtonElement[];
let zoomAmount:HTMLSpanElement;


window.onload = function init() {

    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    gl = canvas.getContext('webgl2', {antialias:true}) as WebGLRenderingContext;
    if (!gl) {
        alert("WebGL isn't available");
    }

    //allow the user to rotate mesh with the mouse
    canvas.addEventListener("mousedown", mouse_down);
    canvas.addEventListener("mousemove", mouse_drag);
    canvas.addEventListener("mouseup", mouse_up);

    //black background
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // set up program
    program = initFileShaders(gl, "vshader-normal.glsl", "fshader-normal.glsl");
    gl.useProgram(program);

    // set up uniforms
    umv = gl.getUniformLocation(program, "model_view");
    uproj = gl.getUniformLocation(program, "projection");
    uLightColor = gl.getUniformLocation(program, "light_color");
    uLightPosition = gl.getUniformLocation(program, "light_position");
    uAmbienLight = gl.getUniformLocation(program, "ambient_light");
    uIsCloud = gl.getUniformLocation(program, "is_cloud");
    uMode = gl.getUniformLocation(program, "mode")

    // set up textures
    ucolormapsampler = gl.getUniformLocation(program, "colorMap");
    gl.uniform1i(ucolormapsampler, 0);
    ucloudmapsampler = gl.getUniformLocation(program, "cloudMap");
    gl.uniform1i(ucloudmapsampler, 1);
    unormalmapsampler = gl.getUniformLocation(program, "normalMap");
    gl.uniform1i(unormalmapsampler, 2);
    unightmapsampler = gl.getUniformLocation(program, "nightMap");
    gl.uniform1i(unightmapsampler, 3);
    uspecularmapsampler = gl.getUniformLocation(program, "specMap");
    gl.uniform1i(uspecularmapsampler, 4);

    //Enable blending and depth
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);

    //set up basic perspective viewing
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    p = perspective(zoom, (canvas.clientWidth / canvas.clientHeight), 1, 20);
    gl.uniformMatrix4fv(uproj, false, p.flatten());

    // make spheres
    initTextures();
    makeSpheresAndBuffer(true);
    makeSpheresAndBuffer(false);

    //initialize rotation angles
    xAngle = 0;
    yAngle = 40;

    //create buttons
    modeButtons = [
        document.getElementById("color") as HTMLButtonElement,
        document.getElementById("cloud") as HTMLButtonElement,
        document.getElementById("night") as HTMLButtonElement,
        document.getElementById("normal") as HTMLButtonElement,
        document.getElementById("spec") as HTMLButtonElement,
        document.getElementById("all") as HTMLButtonElement,
        document.getElementById("zoom-plus") as HTMLButtonElement,
        document.getElementById("zoom-minus") as HTMLButtonElement,
    ];
    modeButtons[0].addEventListener("click", handleColorMapInput);
    modeButtons[1].addEventListener("click", handleCloudMapInput);
    modeButtons[2].addEventListener("click", handleNormalMapInput);
    modeButtons[3].addEventListener("click", handleNightMapInput);
    modeButtons[4].addEventListener("click", handleSpecularMapInput);
    modeButtons[5].addEventListener("click", handleAllMapInput);
    modeButtons[6].addEventListener("click", handleZoomIn);
    modeButtons[7].addEventListener("click", handleZoomOut);

    zoomAmount = document.getElementById("zoom") as HTMLSpanElement;
    zoomAmount.innerText = `${zoom}`;
    handleAllMapInput(); // set the initial state to be the color map

    // prepare for keyboard input
    window.addEventListener("keydown" ,handleKeyboardInput);

    // set up projection matrix
    p = perspective(zoom, (canvas.clientWidth / canvas.clientHeight), 1, 20);
    gl.uniformMatrix4fv(uproj, false, p.flatten());

    //target 60 frames per second
    window.setInterval(update, 16);

    // draw first frame
    requestAnimationFrame(render);
};

function handleInput(key:string){
    switch(key) {
        case "ArrowDown":
            if(zoom < 170){
                zoom += 5;
            }
            zoomAmount.innerText = `${zoom}`;
            break;
        case "ArrowUp":
            if(zoom > 5){
                zoom -= 5;
            }
            zoomAmount.innerText = `${zoom}`;
            break;
        case "1":
            modeButtons[currentMode - 1].className = "";
            currentMode = MODE_COLOR;
            modeButtons[currentMode - 1].className = "selected"
            break;
        case "2":
            modeButtons[currentMode - 1].className = "";
            currentMode = MODE_CLOUD;
            modeButtons[currentMode - 1].className = "selected"
            break;
        case "3":
            modeButtons[currentMode - 1].className = "";
            currentMode = MODE_NIGHT;
            modeButtons[currentMode - 1].className = "selected"
            break;
        case "4":
            modeButtons[currentMode - 1].className = "";
            currentMode = MODE_NORMAL;
            modeButtons[currentMode - 1].className = "selected"
            break;
        case "5":
            modeButtons[currentMode - 1].className = "";
            currentMode = MODE_SPEC;
            modeButtons[currentMode - 1].className = "selected"
            break;
        case "6":
            modeButtons[currentMode - 1].className = "";
            currentMode = MODE_ALL;
            modeButtons[currentMode - 1].className = "selected"
            break;
    }
}

function handleKeyboardInput(event){
    handleInput(event.key);
}

function handleColorMapInput():void{
    handleInput("1");
}
function handleCloudMapInput():void{
    handleInput("2");
}
function handleNormalMapInput():void{
    handleInput("3");
}
function handleNightMapInput():void{
    handleInput("4");
}
function handleSpecularMapInput():void{
    handleInput("5");
}
function handleAllMapInput():void{
    handleInput("6");
}
function handleZoomIn():void{
    handleInput("ArrowUp");
}
function handleZoomOut():void{
    handleInput("ArrowDown");
}

function update(){
    earthRotation += 0.2;
    if(earthRotation >= 360){
        earthRotation %= 360;
    }

    cloudRotation += 0.25;
    if(cloudRotation >= 360){
        cloudRotation %= 360;
    }

    requestAnimationFrame(render);
}

//record that the mouse button is now down
function mouse_down(event:MouseEvent) {
    //establish point of reference for dragging mouse in window
    mouse_button_down = true;
    prevMouseX= event.clientX;
    prevMouseY = event.clientY;
    requestAnimationFrame(render);
}

//record that the mouse button is now up, so don't respond to mouse movements
function mouse_up(){
    mouse_button_down = false;
    requestAnimationFrame(render);
}


//update rotation angles based on mouse movement
function mouse_drag(event:MouseEvent){
    var thetaY, thetaX;
    if (mouse_button_down) {
        thetaY = 360.0 *(event.clientX-prevMouseX)/canvas.clientWidth;
        thetaX = 360.0 *(event.clientY-prevMouseY)/canvas.clientHeight;
        prevMouseX = event.clientX;
        prevMouseY = event.clientY;
        xAngle += thetaX;
        yAngle += thetaY;
    }
    requestAnimationFrame(render);
}

//Make a square and send it over to the graphics card
function makeSpheresAndBuffer( isCloud:boolean){

    let step:number = (360.0 / 180.0)*(Math.PI / 180.0);
    let sphereverts = [];

    numVerts = 0;

    for (let lat:number = 0; lat <= Math.PI ; lat += step){ //latitude
        for (let lon:number = 0; lon + step <= 2 * Math.PI; lon += step){ //longitude
            let lonTexCoord0 = (lon)/ (Math.PI * 2);
            let lonTexCoord1 = (lon + step)/ (Math.PI * 2);
            let latTexCoord0 = - (lat + step)/ (Math.PI);
            let latTexCoord1 = - (lat) / (Math.PI);

            let ax = Math.sin(lat) * Math.sin(lon);
            let ay = Math.cos(lat);
            let az = Math.cos(lon) * Math.sin(lat);
            let a = new vec4( ax, ay, az, 1.0);
            let an = new vec4(ax, ay, az, 0.0);

            let bx = Math.sin(lat) * Math.sin(lon + step);
            let by = Math.cos(lat);
            let bz = Math.sin(lat) * Math.cos(lon + step)
            let b = new vec4(bx, by, bz,  1.0);
            let bn = new vec4(bx, by, bz,  0.0);

            let cx = Math.sin(lat + step) * Math.sin(lon + step);
            let cy = Math.cos(lat + step);
            let cz = Math.cos(lon + step) * Math.sin(lat + step);
            let c= new vec4( cx, cy, cz, 1.0);
            let cn= new vec4( cx, cy, cz, 0.0);

            let dx = Math.sin(lat + step) * Math.sin(lon);
            let dy = Math.cos(lat + step);
            let dz = Math.sin(lat + step) * Math.cos(lon);
            let d = new vec4(dx, dy, dz,  1.0);
            let dn = new vec4(dx, dy, dz,  0.0);

            //triangle 1
            sphereverts.push(a);
            sphereverts.push(an);
            sphereverts.push(getTangent(a, lon));
            sphereverts.push(new vec2(lonTexCoord0,latTexCoord1)); //texture coordinates, bottom left

            sphereverts.push(b);
            sphereverts.push(bn);
            sphereverts.push(getTangent(b, lon));
            sphereverts.push(new vec2(lonTexCoord1,latTexCoord1)); //texture coordinates, bottom left

            sphereverts.push(c);
            sphereverts.push(cn);
            sphereverts.push(getTangent(c, lon));
            sphereverts.push(new vec2(lonTexCoord1,latTexCoord0)); //texture coordinates, bottom left

            // //triangle 2
            sphereverts.push(c);
            sphereverts.push(cn);
            sphereverts.push(getTangent(c, lon));
            sphereverts.push(new vec2(lonTexCoord1,latTexCoord0)); //texture coordinates, bottom left

            sphereverts.push(d);
            sphereverts.push(dn);
            sphereverts.push(getTangent(d, lon));
            sphereverts.push(new vec2(lonTexCoord0,latTexCoord0)); //texture coordinates, bottom left

            sphereverts.push(a);
            sphereverts.push(an);
            sphereverts.push(getTangent(a, lon));
            sphereverts.push(new vec2(lonTexCoord0,latTexCoord1)); //texture coordinates, bottom left

            numVerts += 6;
        }
    }

    //we need some graphics memory for this information
    let bufferId:WebGLBuffer = gl.createBuffer();
    //tell WebGL that the buffer we just created is the one we want to work with right now
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    //send the local data over to this buffer on the graphics card.  Note our use of Angel's "flatten" function
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereverts), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 56, 0);
    gl.enableVertexAttribArray(vPosition);

    vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 56, 16);
    gl.enableVertexAttribArray(vNormal);

    vTangent = gl.getAttribLocation(program, "vTangent");
    gl.vertexAttribPointer(vTangent, 4, gl.FLOAT, false, 56, 32);
    gl.enableVertexAttribArray(vTangent);

    vTexCoord = gl.getAttribLocation(program, "texCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 56, 48);
    gl.enableVertexAttribArray(vTexCoord);
}

function getTangent(normal:vec4, lat:number){
    if(lat > Math.PI/2){ // northern hemisphere
        // the east vector is found by crossing the normal vector with a south-facing vector
        let south = new vec4(0.0, -1.0, 0.0, 1.0);
        return normal.cross(south);
    }

    // southern hemisphere
    // the east vector is found by crossing the normal vector with a north-facing vector
    let north = new vec4(0.0, 1.0, 0.0, 1.0);
    return north.cross(normal);

    // since the north and south hemispheres are opposite, both the direction of the north/south vector and the order
    // they are crossed in have to be switched.
}

function initTextures() {
    earthTex = gl.createTexture();
    earthImage = new Image();
    earthImage.onload = function() { handleTextureLoaded(earthImage, earthTex); }
    earthImage.src = '../textures/Earth.png';

    cloudTex = gl.createTexture();
    cloudImage = new Image();
    cloudImage.onload = function() { handleTextureLoaded(cloudImage, cloudTex); }
    cloudImage.src = '../textures/earthcloudmap-visness.png';

    nightTex = gl.createTexture();
    nightImage = new Image();
    nightImage.onload = function() { handleTextureLoaded(nightImage, nightTex); }
    nightImage.src = '../textures/EarthNight.png';

    normalTex = gl.createTexture();
    normalImage = new Image();
    normalImage.onload = function() { handleTextureLoaded(normalImage, normalTex); }
    normalImage.src = '../textures/EarthNormal.png';

    specTex = gl.createTexture();
    specImage = new Image();
    specImage.onload = function() { handleTextureLoaded(specImage, specTex); }
    specImage.src = '../textures/EarthSpec.png';
}

function handleTextureLoaded(image:HTMLImageElement, texture:WebGLTexture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    let anisotropic_ext:EXT_texture_filter_anisotropic = gl.getExtension('EXT_texture_filter_anisotropic');
    gl.texParameterf(gl.TEXTURE_2D, anisotropic_ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    gl.bindTexture(gl.TEXTURE_2D, null);
}


//draw a frame
function render(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //position camera 10 units back from origin
    let camera:mat4 = lookAt(new vec4(0, 0, 5, 1), new vec4(0, 0, 0, 1), new vec4(0, 1, 0, 0));
    let lightPos = new vec4(0, 0, 50, 1)
    p = perspective(zoom, (canvas.clientWidth / canvas.clientHeight), 1, 20);
    gl.uniformMatrix4fv(uproj, false, p.flatten());

    renderSphere(camera, lightPos, false);
    renderSphere(camera, lightPos, true);

}

function renderSphere(camera:mat4, lightPos:vec4, isCloud:boolean){
    gl.uniform4fv(uLightPosition, rotateY(yAngle).mult(rotateX(xAngle).mult(lightPos)));
    gl.uniform4fv(uLightColor, [1,1,1,1]);
    gl.uniform4fv(uAmbienLight, [0.1, 0.1, 0.1, 1]);

    gl.uniform1f(uMode, currentMode);

    gl.uniform1i(uIsCloud, 0);
    if(isCloud){
        gl.uniform1i(uIsCloud, 1);
    }

    if(isCloud){
        mv = camera
                .mult(rotateY(yAngle)
                .mult(rotateX(xAngle)
                .mult(rotateY(cloudRotation)
                .mult(scalem(1.01, 1.01, 1.01)
            ))));
    } else {
        mv = camera
                .mult(rotateY(yAngle)
                .mult(rotateX(xAngle)
                .mult(rotateY(earthRotation)
                .mult(scalem(1.0, 1.0, 1.0)
            ))));
    }

    gl.uniformMatrix4fv(umv, false, mv.flatten());

    // COLOR
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, earthTex);

    // CLOUD
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cloudTex);

    // NORMAL
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, normalTex);

    // NIGHT
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, nightTex);

    // SPECULAR
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, specTex);

    gl.drawArrays( gl.TRIANGLES, 0, numVerts );
}