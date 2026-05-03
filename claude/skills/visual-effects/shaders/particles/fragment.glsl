precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uCount;
uniform float uDrift;
uniform float uConnectionDistance;
uniform vec2 uMouseRepulsion;

float hash(float n) { return fract(sin(n) * 43758.5453); }

vec2 particlePos(float i) {
    float px = hash(i * 1.3 + 7.1);
    float py = hash(i * 2.7 + 3.5);
    float vx = (hash(i * 5.1 + 1.1) - 0.5) * uDrift;
    float vy = (hash(i * 4.3 + 8.7) - 0.5) * uDrift;
    vec2 pos = vec2(px, py) + vec2(vx, vy) * uTime;
    return fract(pos);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec3 color = vec3(0.0);
    float alpha = 0.0;

    int n = int(uCount);
    for (int i = 0; i < 64; i++) {
        if (i >= n) break;
        vec2 pos = particlePos(float(i));
        float dist = length(uv - pos);

        float dot = smoothstep(0.008, 0.0, dist);
        color += vec3(0.8, 0.9, 1.0) * dot;
        alpha = max(alpha, dot);

        for (int j = i + 1; j < 64; j++) {
            if (j >= n) break;
            vec2 pos2 = particlePos(float(j));
            float lineT = dot(uv - pos, pos2 - pos) / dot(pos2 - pos, pos2 - pos);
            lineT = clamp(lineT, 0.0, 1.0);
            vec2 closest = pos + lineT * (pos2 - pos);
            float lineDist = length(uv - closest);
            float segLen = length(pos2 - pos);
            if (segLen < uConnectionDistance) {
                float fade = 1.0 - segLen / uConnectionDistance;
                float line = smoothstep(0.003, 0.0, lineDist) * fade * 0.4;
                color += vec3(0.5, 0.7, 1.0) * line;
            }
        }
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), clamp(alpha + length(color) * 0.5, 0.0, 1.0));
}
