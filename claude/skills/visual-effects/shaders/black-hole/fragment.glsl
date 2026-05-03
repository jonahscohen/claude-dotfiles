precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uStrength;
uniform float uRadius;
uniform float uRotationSpeed;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 starField(vec2 uv) {
    vec2 g = floor(uv * 80.0);
    float s = hash(g);
    float star = step(0.97, s) * pow(hash(g + 0.5), 3.0);
    return vec3(star);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
    float dist = length(uv);

    float angle = atan(uv.y, uv.x) + uTime * uRotationSpeed;
    float warp = uStrength / (dist + 0.001);
    vec2 warped = uv + normalize(uv) * (-warp * 0.1);

    float rotation = uTime * uRotationSpeed * 2.0;
    float cosR = cos(rotation * warp * 0.5);
    float sinR = sin(rotation * warp * 0.5);
    warped = vec2(warped.x * cosR - warped.y * sinR,
                  warped.x * sinR + warped.y * cosR);

    vec3 bg = starField(warped + 5.0);
    float diskDist = abs(dist - uRadius * 0.7);
    float disk = exp(-diskDist * diskDist * 80.0);
    float diskAngle = fract(angle / (3.14159 * 2.0) + uTime * 0.3);
    vec3 diskColor = mix(vec3(1.0, 0.4, 0.0), vec3(1.0, 0.9, 0.5), diskAngle) * disk * 2.0;

    float event = 1.0 - smoothstep(0.0, uRadius, dist);
    float lensing = smoothstep(uRadius, uRadius * 2.5, dist);

    vec3 color = (bg + diskColor) * lensing;
    color = mix(color, vec3(0.0), event);

    gl_FragColor = vec4(color, 1.0);
}
