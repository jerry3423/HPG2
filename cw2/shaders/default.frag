#version 450

layout(location = 0) out vec4 outColor;

layout(location = 0) in vec2 fragTexCoord;
layout(location = 1) in vec3 fragNormal;
layout(location = 2) in vec3 fragPosition;
layout(location = 3) in mat3 TBN;

struct Light
{
	vec4 lightPosition;
	vec4 lightColor;
};

layout(set = 0, binding = 0) uniform UScene
{
	mat4 camera;
	mat4 projection;
	mat4 projcam;
	vec4 cameraPosition;
	Light pointLight[2];
} uScene;

layout(set = 1, binding = 0) uniform sampler2D baseColorSampler;
layout(set = 1, binding = 1) uniform sampler2D roughnessSampler;
layout(set = 1, binding = 2) uniform sampler2D metalnessSampler;
layout(set = 1, binding = 3) uniform sampler2D normalMapSampler;


float PI = 3.14159265;
float schlickFresnel(float VdotH)
{
	float F0 = 0.04;
	return F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);
}

float blinnPhongD(float NdotH, float shininess)
{
	return (shininess + 2.0) * pow(NdotH, shininess) / (2.0 * PI);
}

float cookTorranceG(float NdotV, float NdotL, float NdotH, float vdh)
{
	float G1 = 2.0 * NdotH * NdotV / vdh;
	float G2 = 2.0 * NdotH * NdotL / vdh;
	return min(1.0, min(G1, G2));
}

void main()
{	
	vec3 baseColor = texture(baseColorSampler, fragTexCoord).rgb;
	float roughness = texture(roughnessSampler, fragTexCoord).r;
	float metalness = texture(metalnessSampler, fragTexCoord).r;
	float alphaValue = texture(baseColorSampler, fragTexCoord).a;
	if(alphaValue < 0.5f) discard;
	vec3 normalmap = texture(normalMapSampler, fragTexCoord).rgb * 2.0f - 1.0f;

	vec3 N = normalize(TBN * normalmap);
	//N = normalize(fragNormal);
	vec3 V = normalize((uScene.cameraPosition.xyz - fragPosition));

	vec3 finalLight = vec3(0.0);

	for(int i = 0; i < 1; i++)
	{
		vec3 lightPosition = uScene.pointLight[i].lightPosition.xyz;
		vec3 lightColor = uScene.pointLight[i].lightColor.xyz;

		vec3 L = normalize((lightPosition - fragPosition));
		vec3 H = normalize(V + L);

		float NdotL = max(dot(N, L), 0.0);
		float NdotV = max(dot(N, V), 0.0);
		float NdotH = max(dot(N, H), 0.0);
		float VdotH = max(dot(V, H), 0.0);
		float vdh = dot(V, H);

		float shininess = 2.0 / (pow(roughness, 4.0) + 0.0001) - 2.0;
		vec3 F0 = mix(vec3(0.04), baseColor, metalness);
		vec3 F = F0 + (vec3(1.0) - F0) * pow(1.0 - dot(H, V), 5.0);

		float D = blinnPhongD(NdotH, shininess);
		float G =  cookTorranceG(NdotV, NdotL, NdotH, vdh);

		vec3 specular = (D * F * G) / (4.0 * NdotV * NdotL + 0.0001);

		vec3 diffuse = baseColor / PI * (lightColor - F) * (1.0 - metalness);

		vec3 ambient = 0.02 * baseColor;
		vec3 directLight = NdotL * (diffuse + specular) * lightColor;
		finalLight += ambient + directLight;
		finalLight = vec3(G,G,G);
	}

	outColor = vec4(finalLight, alphaValue);
}


