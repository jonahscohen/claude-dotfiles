precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uReflectivity;
uniform float uViscosity;
uniform float uTurbulence;
uniform vec3 uColorTint;

vec3 hash3(vec2 p) {
    vec3 q = vec3(dot(p, vec2(127.1, 311.7)),
                  dot(p, vec2(269.5, 183.3)),
                  dot(p, vec2(419.2, 371.9)));
    return fract(sin(q) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(dot(hash3(i + vec2(0,0)).xy, f - vec2(0,0)),
                   dot(hash3(i + vec2(1,0)).xy, f - vec2(1,0)), u.x),
               mix(dot(hash3(i + vec2(0,1)).xy, f - vec2(0,1)),
                   dot(hash3(i + vec2(1,1)).xy, f - vec2(1,1)), u.x), u.y);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float t = uTime * (1.0 - uViscosity * 0.8);

    float n1 = noise(uv * 3.0 * uTurbulence + vec2(t * 0.3, t * 0.2));
    float n2 = noise(uv * 6.0 * uTurbulence + vec2(-t * 0.2, t * 0.4));
    float n3 = noise(uv * 12.0 * uTurbulence + vec2(t * 0.1, -t * 0.3));

    float surface = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    surface = surface * 0.5 + 0.5;

    vec2 normal = vec2(
        dFdx(surface),
        dFdy(surface)
    ) * 8.0;

    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
    float diffuse = max(dot(vec3(normal, 1.0), lightDir), 0.0);
    float spec = pow(max(diffuse, 0.0), 32.0) * uReflectivity;

    vec3 base = mix(vec3(0.05), vec3(0.9), surface);
    vec3 chrome = base + spec;
    chrome = mix(chrome, chrome * uColorTint * 1.5, 0.4);

    gl_FragColor = vec4(clamp(chrome, 0.0, 1.0), 1.0);
}
