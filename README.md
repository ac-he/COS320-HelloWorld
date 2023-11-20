# COS320-Hello World

Demonstration of texture rendering for Computer Graphics Programming class. 
Renders the globe using day, night, normal, specular, and cloud maps of the earth.

Setup instructions from prof.:

    Download and install the appropriate LTS version of Node.js for your system: https://nodejs.org/en/download/
        
        After installing Node.js, open up a terminal/command prompt and run the command
            
            npm install --save @types/webgl2

Textures required, found at http://www.celestiamotherlode.net/catalog/earth.html:
1. Earth.png                       "Real color Earth surface" png by Shadmith 
2. Earthcloudmap-visness.png       2k/4k/8k pngs by John van Vliet
3. EarthNight.png                  night map by Ted Jong
4. EarthNormal.png                 2k/4k/8k pngs by John van Vliet
5. EarthSpec.png                   2k/4k/8k pngs by John van Vliet
Place these textures in the _textures_ directory.