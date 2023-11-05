import {
    flatten,
    initFileShaders,
    lookAt,
    mat4,
    perspective,
    rotateX,
    rotateY,
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

let vPosition:GLint; //
let vNormal:GLint; //actually need a normal vector to modify
let vTangent:GLint; //need a tangent vector as well
let utexmapsampler:WebGLUniformLocation;//this will be a pointer to our sampler2D
let unormalmapsampler:WebGLUniformLocation;
let uLightPosition:WebGLUniformLocation;
let uAmbienLight:WebGLUniformLocation;
let uLightColor:WebGLUniformLocation;
let vTexCoord:GLint;


//uniform locations
let umv:WebGLUniformLocation; //uniform for mv matrix
let uproj:WebGLUniformLocation; //uniform for projection matrix
//matrices
let mv:mat4; //local mv
let p:mat4; //local projection

//
let numVerts:number;

let flattex:WebGLTexture;
let brickcolortex:WebGLTexture;
let bricknormaltex:WebGLTexture;

let flatimage:HTMLImageElement;
let brickcolorimage:HTMLImageElement;
let bricknormalimage:HTMLImageElement;

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

    utexmapsampler = gl.getUniformLocation(program, "colorMap");
    gl.uniform1i(utexmapsampler, 0);//assign this one to texture unit 0
    unormalmapsampler = gl.getUniformLocation(program, "normalMap");
    gl.uniform1i(unormalmapsampler, 1);//assign normal map to 2nd texture unit


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
        }

        p = perspective(zoom, (canvas.clientWidth / canvas.clientHeight), 1, 20);
        gl.uniformMatrix4fv(uproj, false, p.flatten());
        requestAnimationFrame(render);//and now we need a new frame since we made a change
    });

    requestAnimationFrame(render);

};

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
        for (let lon:number = 0; lon + step <= 2*Math.PI; lon += step){ //longitude
            let latTexCoord0 = (0 + (lon)/ (Math.PI * 2));
            let latTexCoord1 = (0 + (lon + 1 * step)/ (Math.PI * 2));
            let lonTexCoord0 = (0 - (lat + step)/ (Math.PI * 1));
            let lonTexCoord1 = (0 - (lat) / (Math.PI * 1));
            //triangle 1

            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon) ,Math.cos(lat) , Math.cos(lon) * Math.sin(lat), 1.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon), Math.cos(lat),Math.cos(lon) * Math.sin(lat),  0.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon), Math.cos(lat),Math.cos(lon) * Math.sin(lat),  0.0));
            sphereverts.push(new vec2(latTexCoord0,lonTexCoord1)); //texture coordinates, bottom left

            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon + step), Math.cos(lat),Math.sin(lat) * Math.cos(lon + step),  1.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon + step),  Math.cos(lat),Math.sin(lat) * Math.cos(lon + step), 0.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon + step),  Math.cos(lat),Math.sin(lat) * Math.cos(lon + step), 0.0));
            sphereverts.push(new vec2(latTexCoord1,lonTexCoord1)); //texture coordinates, bottom left

            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step), Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step),  1.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step), Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step),  0.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step), Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step),  0.0));
            sphereverts.push(new vec2(latTexCoord1,lonTexCoord0)); //texture coordinates, bottom left

            // //triangle 2
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step),  Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step), 1.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step),  Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step), 0.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step),  Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step), 0.0));
            sphereverts.push(new vec2(latTexCoord1,lonTexCoord0)); //texture coordinates, bottom left

            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon), Math.cos(lat + step),Math.sin(lat + step) * Math.cos(lon),  1.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon), Math.cos(lat + step), Math.sin(lat + step) * Math.cos(lon), 0.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon), Math.cos(lat + step), Math.sin(lat + step) * Math.cos(lon), 0.0));
            sphereverts.push(new vec2(latTexCoord0,lonTexCoord0)); //texture coordinates, bottom left

            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon), Math.cos(lat),Math.cos(lon) * Math.sin(lat),  1.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon),  Math.cos(lat),Math.cos(lon) * Math.sin(lat), 0.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon),  Math.cos(lat),Math.cos(lon) * Math.sin(lat), 0.0));
            sphereverts.push(new vec2(latTexCoord0,lonTexCoord1)); //texture coordinates, bottom left

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
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 56, 0); //stride is 56 bytes total for position, normal, tangent texcoord
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

//https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
function initTextures() {
    brickcolortex = gl.createTexture();
    brickcolorimage = new Image();
    brickcolorimage.onload = function() { handleTextureLoaded(brickcolorimage, brickcolortex); }
    brickcolorimage.src = '../textures/Earth.png';

    bricknormaltex = gl.createTexture();
    bricknormalimage = new Image();
    bricknormalimage.onload = function() { handleTextureLoaded(bricknormalimage, bricknormaltex); }
    bricknormalimage.src = '../textures/EarthNormal.png';
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


    gl.uniform4fv(uLightPosition, [0, 0, 50, 1]);  //light is locked to the camera position
    gl.uniform4fv(uLightColor, [1,1,1,1]);
    gl.uniform4fv(uAmbienLight, [1, 1, 1, 1]);


    mv = camera.mult(rotateY(yAngle).mult(rotateX(xAngle)));
    gl.uniformMatrix4fv(umv, false, mv.flatten());

    gl.activeTexture(gl.TEXTURE0); //texture unit 0 should be mapped to...
    gl.bindTexture(gl.TEXTURE_2D, brickcolortex); //which texture do we want?
    gl.activeTexture(gl.TEXTURE1); //and now that we're drawing the normal mapped square
    gl.bindTexture(gl.TEXTURE_2D, bricknormaltex); //switch to the normal map texture
    gl.drawArrays( gl.TRIANGLES, 0, numVerts );

}