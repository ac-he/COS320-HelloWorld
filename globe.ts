import {
    flatten,
    initFileShaders,
    lookAt,
    mat4,
    perspective,
    rotateX,
    rotateY, rotateZ,
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
let zoom:number = 45;
let earthRotation:number = 0;

let vPosition:GLint; //
let vNormal:GLint; //actually need a normal vector to modify
let vTangent:GLint; //need a tangent vector as well
let ucolormapsampler:WebGLUniformLocation;//this will be a pointer to our sampler2D
let unormalmapsampler:WebGLUniformLocation;
let ucloudmapsampler:WebGLUniformLocation;
let unightmapsampler:WebGLUniformLocation;
let uspecularmapsampler:WebGLUniformLocation;
let uLightPosition:WebGLUniformLocation;
let uAmbienLight:WebGLUniformLocation;
let uLightColor:WebGLUniformLocation;
let vTexCoord:GLint;
let uMode:WebGLUniformLocation;


//uniform locations
let umv:WebGLUniformLocation; //uniform for mv matrix
let uproj:WebGLUniformLocation; //uniform for projection matrix
//matrices
let mv:mat4; //local mv
let p:mat4; //local projection

//
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
    gl.enable(gl.DEPTH_TEST);


    program = initFileShaders(gl, "vshader-normal.glsl", "fshader-normal.glsl");

    gl.useProgram(program);
    umv = gl.getUniformLocation(program, "model_view");
    uproj = gl.getUniformLocation(program, "projection");
    uLightColor = gl.getUniformLocation(program, "light_color");
    uLightPosition = gl.getUniformLocation(program, "light_position");
    uAmbienLight = gl.getUniformLocation(program, "ambient_light");
    uMode = gl.getUniformLocation(program, "mode")

    ucolormapsampler = gl.getUniformLocation(program, "colorMap");
    gl.uniform1i(ucolormapsampler, 0);//assign this one to texture unit 0
    ucloudmapsampler = gl.getUniformLocation(program, "cloudMap");
    gl.uniform1i(ucloudmapsampler, 1);//assign this one to texture unit 0
    unormalmapsampler = gl.getUniformLocation(program, "normalMap");
    gl.uniform1i(unormalmapsampler, 2);//assign normal map to 2nd texture unit
    unightmapsampler = gl.getUniformLocation(program, "nightMap");
    gl.uniform1i(unightmapsampler, 3);//assign normal map to 2nd texture unit
    uspecularmapsampler = gl.getUniformLocation(program, "specMap");
    gl.uniform1i(uspecularmapsampler, 4);//assign this one to texture unit 0


    //set up basic perspective viewing
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    p = perspective(zoom, (canvas.clientWidth / canvas.clientHeight), 1, 20);
    gl.uniformMatrix4fv(uproj, false, p.flatten());


    initTextures();
    makeSphereAndBuffer();

    //initialize rotation angles
    xAngle = 0;
    yAngle = 0;

    window.addEventListener("keydown" ,function(event){
        switch(event.key) {
            case "ArrowDown":
                if(zoom < 170){
                    zoom += 5;
                }
                break;
            case "ArrowUp":
                if(zoom > 10){
                    zoom -= 5;
                }
                break;
            case "1":
                currentMode = MODE_COLOR;
                break;
            case "2":
                currentMode = MODE_CLOUD;
                break;
            case "3":
                currentMode = MODE_NIGHT;
                break;
            case "4":
                currentMode = MODE_NORMAL;
                break;
            case "5":
                currentMode = MODE_SPEC;
                break;
            case "6":
                currentMode = MODE_ALL;
                break;
        }

        p = perspective(zoom, (canvas.clientWidth / canvas.clientHeight), 1, 20);
        gl.uniformMatrix4fv(uproj, false, p.flatten());
        requestAnimationFrame(render);//and now we need a new frame since we made a change
    });

    window.setInterval(update, 16); //target 60 frames per second

    requestAnimationFrame(render);

};

function update(){
    earthRotation += 0.25;
    if(earthRotation >= 360){
        earthRotation %= 360;
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
function makeSphereAndBuffer(){

    let step:number = (360.0 / 60.0)*(Math.PI / 180.0);
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

            let bx = Math.sin(lat) * Math.sin(lon + step);
            let by = Math.cos(lat);
            let bz = Math.sin(lat) * Math.cos(lon + step)

            let cx = Math.sin(lat + step) * Math.sin(lon + step);
            let cy = Math.cos(lat + step);
            let cz = Math.cos(lon + step) * Math.sin(lat + step);

            let dx = Math.sin(lat + step) * Math.sin(lon);
            let dy = Math.cos(lat + step);
            let dz = Math.sin(lat + step) * Math.cos(lon);

            //TODO tangents need to be calculated properly. right now tangent = normal
            //triangle 1
            sphereverts.push(new vec4( ax, ay, az, 1.0));
            sphereverts.push(new vec4( ax, ay, az, 0.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon), Math.cos(lat),Math.cos(lon) * Math.sin(lat),  0.0));
            sphereverts.push(new vec2(lonTexCoord0,latTexCoord1)); //texture coordinates, bottom left

            sphereverts.push(new vec4(bx, by, bz,  1.0));
            sphereverts.push(new vec4(bx, by, bz,  0.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon + step),  Math.cos(lat),Math.sin(lat) * Math.cos(lon + step), 0.0));
            sphereverts.push(new vec2(lonTexCoord1,latTexCoord1)); //texture coordinates, bottom left

            sphereverts.push(new vec4( cx, cy, cz, 1.0));
            sphereverts.push(new vec4( cx, cy, cz, 0.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step), Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step),  0.0));
            sphereverts.push(new vec2(lonTexCoord1,latTexCoord0)); //texture coordinates, bottom left

            // //triangle 2
            sphereverts.push(new vec4( cx, cy, cz, 1.0));
            sphereverts.push(new vec4( cx, cy, cz, 0.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step),  Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step), 0.0));
            sphereverts.push(new vec2(lonTexCoord1,latTexCoord0)); //texture coordinates, bottom left

            sphereverts.push(new vec4(dx, dy, dz,  1.0));
            sphereverts.push(new vec4(dx, dy, dz, 0.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon), Math.cos(lat + step), Math.sin(lat + step) * Math.cos(lon), 0.0));
            sphereverts.push(new vec2(lonTexCoord0,latTexCoord0)); //texture coordinates, bottom left

            sphereverts.push(new vec4( ax, ay, az, 1.0));
            sphereverts.push(new vec4( ax, ay, az,  0.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon),  Math.cos(lat),Math.cos(lon) * Math.sin(lat), 0.0));
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
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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

    let lightPos = new vec4(0, 0, 50, 1);

    gl.uniform4fv(uLightPosition, rotateY(yAngle).mult(rotateX(xAngle).mult(lightPos)));
    gl.uniform4fv(uLightColor, [1,1,1,1]);
    gl.uniform4fv(uAmbienLight, [0.1, 0.1, 0.1, 1]);

    gl.uniform1f(uMode, currentMode);

    mv = camera.mult(rotateY(yAngle).mult(rotateX(xAngle).mult(rotateY(earthRotation))));
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