precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uDotSize;
uniform float uSpacing;
uniform vec3 uColor;
uniform float uPulseSpeed;

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float aspect = uResolution.x / uResolution.y;
    vec2 scaledUv = vec2(uv.x * aspect, uv.y);

    vec2 grid = scaledUv * uSpacing;
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;

    float cellHash = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
    float phaseOffset = cellHash * 6.2831;
    float pulse = 0.5 + 0.5 * sin(uTime * uPulseSpeed + phaseOffset);

    float r = uDotSize * (0.8 + 0.2 * pulse);
    float d = length(local);
    float dot = smoothstep(r, r - 0.015, d);

    vec3 color = uColor * (0.6 + 0.4 * pulse) * dot;
    float alpha = dot;

    gl_FragColor = vec4(color, alpha);
}
