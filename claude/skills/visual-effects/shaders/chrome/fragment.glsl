precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uRoughness;
uniform float uEnvironmentIntensity;
uniform float uWarpSpeed;

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
    float b = fract(sin(dot(i + vec2(1,0), vec2(127.1, 311.7))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0,1), vec2(127.1, 311.7))) * 43758.5453);
    float d = fract(sin(dot(i + vec2(1,1), vec2(127.1, 311.7))) * 43758.5453);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float t = uTime * uWarpSpeed;

    float n1 = noise(uv * 2.0 + vec2(t * 0.1, t * 0.07));
    float n2 = noise(uv * 5.0 + vec2(-t * 0.08, t * 0.12));
    float n3 = noise(uv * 11.0 + vec2(t * 0.05, -t * 0.09));
    float roughNoise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

    float env1 = noise(vec2(uv.x * 1.5 + roughNoise * uRoughness, t * 0.05));
    float env2 = noise(vec2(uv.y * 1.5 + roughNoise * uRoughness, t * 0.04 + 5.0));

    vec3 envLight = vec3(
        mix(0.05, 0.95, env1),
        mix(0.08, 0.92, (env1 + env2) * 0.5),
        mix(0.1, 1.0, env2)
    ) * uEnvironmentIntensity;

    float rim = pow(abs(uv.x - 0.5) * 2.0, 2.0) + pow(abs(uv.y - 0.5) * 2.0, 2.0);
    rim = clamp(1.0 - rim, 0.0, 1.0);
    float specular = pow(max(env1 * env2, 0.0), mix(2.0, 64.0, 1.0 - uRoughness)) * rim;

    vec3 chrome = mix(vec3(0.05, 0.07, 0.1), envLight, 0.9);
    chrome += specular * 0.8;

    gl_FragColor = vec4(clamp(chrome, 0.0, 1.0), 1.0);
}
