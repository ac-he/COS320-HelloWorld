#version 300 es

precision highp float;

in vec2 ftexCoord;
in vec3 vT; //parallel to surface in eye space
in vec3 vN; //perpendicular to surface in eye space
in vec4 position;

uniform vec4 light_position;
uniform vec4 light_color;
uniform vec4 ambient_light;

uniform sampler2D colorMap;
uniform sampler2D cloudMap;
uniform sampler2D normalMap;
uniform sampler2D nightMap;
uniform sampler2D specMap;

uniform float mode;

uniform int is_cloud;

out vec4  fColor;

void main()
{
	//don't forget to re-normalize normal and tangent vectors on arrival
	vec3 vNormal = normalize(vN);
	vec3 vTangent = normalize(vT);

	//binormal is cross of normal and tangent vectors in eye space
	vec3 vBinormal = cross(vNormal, vTangent);

	vec3 L = normalize(light_position.xyz - position.xyz);// LIGHT
	vec3 V = normalize(-position.xyz);// VIEW
	vec3 N = normalize(vN.xyz);// NORMAL
	vec3 R = normalize(reflect(-L, N));// REFLECT

	/*
	COLOR MODE
	*/
	if(mode == 1.0){
		if(is_cloud == 0){
			vec4 amb = texture(colorMap, ftexCoord) * ambient_light;
			vec4 diff = max(dot(L, N.xyz), 0.0) * texture(colorMap, ftexCoord) * light_color;

			fColor = amb + diff;
		}
	}

	/*
	CLOUD MODE
	*/
	else if(mode == 2.0) {
		if(is_cloud == 1){ // cloud layer
			float originalTransparency = texture(cloudMap, ftexCoord).a; // preserve transparency level
			vec4 amb = texture(cloudMap, ftexCoord) * ambient_light;
			vec4 diff = max(dot(L, N.xyz), 0.0) * texture(cloudMap, ftexCoord) * light_color;

			fColor = amb + diff;
			fColor.a = originalTransparency; // reset to original transparency level
		} else { // earth layer
			// the same as day color mode
			vec4 amb = texture(colorMap, ftexCoord) * ambient_light;
			vec4 diff = max(dot(L, N.xyz), 0.0) * texture(colorMap, ftexCoord) * light_color;

			fColor = amb + diff;
		}
	}

	/*
	NIGHT MODE
	*/
	else if(mode == 3.0) {
		if(is_cloud == 0){
			// set up the day and night textures
			vec4 nightTex = texture(nightMap, ftexCoord);
			vec4 dayTex = texture(colorMap, ftexCoord);
			dayTex = dayTex * ambient_light + max(dot(L, N.xyz), 0.0) * dayTex * light_color;

			vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
			float twilightZoneWidth = 0.1;
			if (dot(L, N) < -twilightZoneWidth) { // night zone
				color = nightTex;
			} else if (dot(L, N) > twilightZoneWidth) { // daylight zone
				color = dayTex;
			} else { // twilight zone
				float percentDay = ((dot(L, N) + twilightZoneWidth))*0.5/twilightZoneWidth ;
				color = dayTex * percentDay + nightTex * (1.0 - percentDay);
			}

			color.a = 1.0;
			fColor = color;
		}

	}

	/*
	NORMAL MODE
	*/
	else if(mode == 4.0) {
		if(is_cloud == 0){
			vec3 vNormal = normalize(vN);
			vec3 vTangent = normalize(vT);
			// the binormal is perpendicular to both the normal and the tangent
			vec3 vBinormal = cross(vNormal, vTangent);

			//Transform from local space (normal map values) to eye space
			// create tangent space transformation matrix
			mat4 mTangentSpace = mat4(vec4(vTangent,0.0), vec4(vBinormal,0.0), vec4(vNormal,0.0), vec4(0.0, 0.0, 0.0, 1.0));
			// normal vector from map
			vec4 N = (texture(normalMap, ftexCoord) - 0.5) * 2.0 ;
			// combine normal vector from map with the tangent space
			N = mTangentSpace * N;

			vec4 amb = vec4(1.0, 1.0, 1.0, 1.0) * ambient_light;
			vec4 diff = max(dot(L,N.xyz), 0.0) * vec4(1.0, 1.0, 1.0, 1.0) * light_color;
			fColor = amb + diff;
		}
	}

	/*
	SPECULAR MODE
	*/
	else if(mode == 5.0) {
		if(is_cloud == 0){
			vec4 color;
			if (texture(specMap, ftexCoord).a <= 0.1){ // land is black
				color = vec4(0.0, 0.0, 0.0, 1.0);
			} else { // sea is white
				color = vec4(1.0, 1.0, 1.0, 1.0);
			}

			vec4 amb = vec4(color) * ambient_light;
			vec4 diff = max(dot(L, N.xyz), 0.0) * vec4(color) * light_color;
			vec4 spec = pow(max(dot(R, V), 0.0), 30.0) * texture(specMap, ftexCoord) * light_color;

			// don't use the specular term if it is over the horizon
			if (dot(L, N) < 0.0) {
				spec = vec4(0, 0, 0, 0);
			}

			fColor = amb + diff + spec;
		}
	}

	/*
	ALL MODE
	*/
	else if(mode == 6.0) {
		if(is_cloud == 0){ // Earth Layer
			vec4 color = vec4(0.0, 0.0, 0.0, 0.0); // default color

			float twilightZoneWidth = 0.1;
			vec3 vBinormal = cross(vNormal, vTangent);

			//Transform from local space (normal map values) to eye space
			mat4 mTangentSpace = mat4(vec4(vTangent,0.0), vec4(vBinormal,0.0), vec4(vNormal,0.0), vec4(0.0, 0.0, 0.0, 1.0));
			vec4 eyeN = (texture(normalMap, ftexCoord) - 0.5) * 2.0 ;
			eyeN = mTangentSpace * eyeN;
			vec3 eyeN3 = eyeN.xyz;

			// calculate day and night textures
			vec4 nightTex = texture(nightMap, ftexCoord);
			vec4 dayTex = texture(colorMap, ftexCoord);
			dayTex = dayTex * ambient_light + max(dot(L, eyeN3), 0.0) * dayTex * light_color;

			if (dot(L, eyeN3) < -twilightZoneWidth) { // nighttime
				color = nightTex;

			} else if (dot(L, eyeN3) > twilightZoneWidth) { // daytime
				color = dayTex;

			} else { // other
				float percentDay = (dot(L, eyeN3) + twilightZoneWidth) * 0.5/twilightZoneWidth;
				color = dayTex * percentDay + nightTex * (1.0 - percentDay);
			}

			// calculate the specular term
			vec4 spec = pow(max(dot(R, V), 0.0), 30.0) * texture(specMap, ftexCoord) * light_color;
			if (dot(L, N) < 0.0) { // don't use it if it is over the horizon
				spec = vec4(0, 0, 0, 0);
			}

			color.a = 1.0;
			fColor = color + spec;


		} else { //  Cloud Layer
			float originalTransparency = texture(cloudMap, ftexCoord).a;
			vec4 amb = texture(cloudMap, ftexCoord) * ambient_light;
			vec4 diff = max(dot(L, N.xyz), 0.0) * texture(cloudMap, ftexCoord) * light_color;

			fColor = amb + diff;
			fColor.a = originalTransparency;
		}

	/*
	DEFAULT (SOMETHING WENT WRONG)
	*/
	} else {
		fColor = vec4(1, 1, 1, 1);
	}

}