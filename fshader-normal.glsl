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
uniform sampler2D normalMap;

out vec4  fColor;

void main()
{

	//don't forget to re-normalize normal and tangent vectors on arrival
	vec3 vNormal = normalize(vN);
	vec3 vTangent = normalize(vT);

	//binormal is cross of normal and tangent vectors in eye space
	vec3 vBinormal = cross(vNormal, vTangent);

	//construct a change of coordinate frame mat4 with columns of
	//Tangent, Binormal, Normal, (0,0,0,1)
	mat4 mTangentSpace = mat4(vec4(vTangent,0.0), vec4(vBinormal,0.0), vec4(vNormal,0.0), vec4(0.0, 0.0, 0.0, 1.0));
	//This will transform from local space (normal map values) to eye space


	vec3 L = normalize(light_position - position).xyz;
	vec3 E = normalize(-position).xyz;

	//read from normal map
	//values stored in normal texture is [0,1] range, we need [-1, 1] range
	vec4 N = (texture(normalMap, ftexCoord) - 0.5) * 2.0 ;

	//multiply change of coordinate frame matrix by normal map value
	//to convert from local space to eye space
	N = mTangentSpace * N;

	vec4 amb = texture(colorMap, ftexCoord) * ambient_light;
	//calculate diffuse term using our eye-space vectors and the color map value
	vec4 diff = max(dot(L,N.xyz), 0.0) * texture(colorMap, ftexCoord) * light_color;

	//bricks aren't shiny, so we'll skip the specular term on this one
	fColor = amb + diff;

}