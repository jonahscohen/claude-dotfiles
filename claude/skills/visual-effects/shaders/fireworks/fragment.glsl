precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uBurstCount;
uniform float uGravity;
uniform float uTrailLength;
uniform float uColorSpread;

float hash(float n) { return fract(sin(n) * 43758.5453); }
vec3 hsvToRgb(float h, float s, float v) {
    vec3 p = abs(fract(vec3(h) + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec3 color = vec3(0.0);

    int nb = int(uBurstCount);
    for (int b = 0; b < 8; b++) {
        if (b >= nb) break;
        float bf = float(b);
        float burstTime = uTime - hash(bf * 3.7) * 4.0;
        burstTime = mod(burstTime, 5.0);

        vec2 origin = vec2(hash(bf * 1.1 + 0.3), hash(bf * 2.3 + 0.7) * 0.6 + 0.2);
        float hue = hash(bf * 5.9) * uColorSpread;

        for (int p = 0; p < 12; p++) {
            float pf = float(p);
            float angle = pf / 12.0 * 6.2831 + hash(bf * 7.1 + pf) * 0.5;
            float speed = 0.2 + hash(bf * 4.1 + pf * 0.7) * 0.2;
            vec2 vel = vec2(cos(angle), sin(angle)) * speed;
            vec2 pos = origin + vel * burstTime
                + vec2(0.0, -uGravity * burstTime * burstTime * 0.05);
            float fade = 1.0 - clamp(burstTime / uTrailLength, 0.0, 1.0);
            float d = length(uv - pos);
            float glow = smoothstep(0.018, 0.0, d) * fade;
            color += hsvToRgb(hue + pf * 0.05, 0.8, 1.0) * glow;
        }
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), clamp(length(color), 0.0, 1.0));
}
