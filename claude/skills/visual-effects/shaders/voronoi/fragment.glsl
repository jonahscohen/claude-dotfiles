precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uCellCount;
uniform float uEdgeWidth;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uEdgeColor;

vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 p = uv * uCellCount;
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float minDist = 1.0;
    float secondDist = 1.0;
    vec2 minPoint = vec2(0.0);
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash(ip + neighbor);
            point = 0.5 + 0.5 * sin(uTime * 0.5 + 6.2831 * point);
            vec2 diff = neighbor + point - fp;
            float d = length(diff);
            if (d < minDist) {
                secondDist = minDist;
                minDist = d;
                minPoint = point;
            } else if (d < secondDist) {
                secondDist = d;
            }
        }
    }
    float edge = smoothstep(0.0, uEdgeWidth, secondDist - minDist);
    vec3 cellColor = mix(uColor1, uColor2, minPoint.x);
    vec3 color = mix(uEdgeColor, cellColor, edge);
    gl_FragColor = vec4(color, 1.0);
}
