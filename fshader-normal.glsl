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

out vec4  fColor;

void main()
{
	/*
	COLOR MODE
	*/
	if(mode == 1.0){
		//don't forget to re-normalize normal and tangent vectors on arrival
		vec3 vNormal = normalize(vN);
		vec3 vTangent = normalize(vT);

		//binormal is cross of normal and tangent vectors in eye space
		vec3 vBinormal = cross(vNormal, vTangent);

		vec3 L = normalize(light_position - position).xyz;
		vec3 E = normalize(-position).xyz;
		vec4 N = vec4(vN, 0.0);

		vec4 amb = texture(colorMap, ftexCoord) * ambient_light;
		//calculate diffuse term using our eye-space vectors and the color map value
		vec4 diff = max(dot(L, N.xyz), 0.0) * texture(colorMap, ftexCoord) * light_color;

		fColor = amb + diff;
	}

	/*
	CLOUD MODE
	*/
	else if(mode == 2.0) {
		fColor = vec4(1, 1, 1, 1);
	}

	/*
	NIGHT MODE
	*/
	else if(mode == 3.0) {
		fColor = vec4(1, 1, 0, 1);
	}

	/*
	NORMAL MODE
	*/
	else if(mode == 4.0) {
		fColor = vec4(0, 1, 0, 1);
	}

	/*
	SPECULAR MODE
	*/
	else if(mode == 5.0) {
		vec3 L = normalize(light_position.xyz - position.xyz);// LIGHT
		vec3 V = normalize(-position.xyz);// VIEW
		vec3 N = normalize(vN.xyz);// NORMAL
		vec3 R = normalize(reflect(-L, N));// REFLECT

		vec4 color;
		if(texture(specMap, ftexCoord).a <= 0.1){ // land
			color = vec4(0.0, 0.0, 0.0, 1.0);
		} else {
			color = vec4(1.0, 1.0, 1.0, 1.0);
		}

		vec4 amb = vec4(color) * ambient_light;
		vec4 diff = max(dot(L, N.xyz), 0.0) * vec4(color) * light_color;
		vec4 spec = pow(max(dot(R, V), 0.0), 30.0) * texture(specMap, ftexCoord) * light_color;
		fColor = amb + diff + spec;

	}

	/*
	ALL MODE
	*/
	else if(mode == 6.0) {
		//don't forget to re-normalize normal and tangent vectors on arrival
		vec3 vNormal = normalize(vN);
		vec3 vTangent = normalize(vT);

		//binormal is cross of normal and tangent vectors in eye space
		vec3 vBinormal = cross(vNormal, vTangent);

		vec3 E = normalize(-position).xyz;
		vec3 L = normalize(light_position.xyz - position.xyz);// LIGHT
		vec3 V = normalize(-position.xyz);// VIEW
		vec3 N = normalize(vN.xyz);// NORMAL
		vec3 R = normalize(reflect(-L, N));// REFLECT

		vec4 amb = texture(colorMap, ftexCoord) * ambient_light;
		//calculate diffuse term using our eye-space vectors and the color map value
		vec4 diff = max(dot(L,N.xyz), 0.0) * texture(colorMap, ftexCoord) * light_color;
		vec4 spec = pow(max(dot(R, V), 0.0), 30.0) * texture(specMap, ftexCoord) * light_color;
		fColor = amb + diff + spec;

	} else {
		fColor = vec4(1, 1, 1, 1);
	}

}