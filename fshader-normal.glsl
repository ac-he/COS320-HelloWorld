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
		if(is_cloud == 1){
			float originalTransparency = texture(cloudMap, ftexCoord).a;
			vec4 amb = texture(cloudMap, ftexCoord) * ambient_light;
			vec4 diff = max(dot(L, N.xyz), 0.0) * texture(cloudMap, ftexCoord) * light_color;

			fColor = amb + diff;
			fColor.a = originalTransparency;
		} else {
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
			vec4 nightTex = texture(nightMap, ftexCoord);

			vec4 dayTex = texture(colorMap, ftexCoord);
			dayTex = dayTex * ambient_light + max(dot(L, N.xyz), 0.0) * dayTex * light_color;

			vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
			float twilightZoneWidth = 0.5;
			if (dot(L, N) < -twilightZoneWidth) { // night zone
				color = nightTex;
			} else if (dot(L, N) > twilightZoneWidth) { // daylight zone
				color = dayTex;
			} else { // twilight zone
				float percentDay = (dot(L, N) + twilightZoneWidth);
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
			fColor = vec4(0, 1, 0, 1);
		}
	}

	/*
	SPECULAR MODE
	*/
	else if(mode == 5.0) {
		if(is_cloud == 0){
			vec4 color;
			if (texture(specMap, ftexCoord).a <= 0.1){ // land
				color = vec4(0.0, 0.0, 0.0, 1.0);
			} else {
				color = vec4(1.0, 1.0, 1.0, 1.0);
			}

			vec4 amb = vec4(color) * ambient_light;
			vec4 diff = max(dot(L, N.xyz), 0.0) * vec4(color) * light_color;
			vec4 spec = pow(max(dot(R, V), 0.0), 30.0) * texture(specMap, ftexCoord) * light_color;

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
		if(is_cloud == 0){
			vec4 nightTex = texture(nightMap, ftexCoord);

			vec4 dayTex = texture(colorMap, ftexCoord);
			dayTex = dayTex * ambient_light + max(dot(L, N.xyz), 0.0) * dayTex * light_color;

			vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
			float twilightZoneWidth = 0.5;
			if (dot(L, N) < -twilightZoneWidth) {
				color = nightTex;
			} else if (dot(L, N) > twilightZoneWidth) {
				color = dayTex;
			} else {
				float percentDay = (dot(L, N) + twilightZoneWidth);
				color = dayTex * percentDay + nightTex * (1.0 - percentDay);
			}

			color.a = 1.0;

			vec4 spec = pow(max(dot(R, V), 0.0), 30.0) * texture(specMap, ftexCoord) * light_color;

			if (dot(L, N) < 0.0) {
				spec = vec4(0, 0, 0, 0);
			}

			fColor = color + spec;
		} else {
			float originalTransparency = texture(cloudMap, ftexCoord).a;
			vec4 amb = texture(cloudMap, ftexCoord) * ambient_light;
			vec4 diff = max(dot(L, N.xyz), 0.0) * texture(cloudMap, ftexCoord) * light_color;

			fColor = amb + diff;
			fColor.a = originalTransparency;
		}
	} else {
		fColor = vec4(1, 1, 1, 1);
	}

}