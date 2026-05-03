precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uArms;
uniform float uTightness;
uniform float uRotationSpeed;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

void main() {
    vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    float logSpiral = log(dist + 0.001) / uTightness;
    float spiralAngle = angle - logSpiral - uTime * uRotationSpeed;
    float arms = sin(spiralAngle * uArms) * 0.5 + 0.5;

    float falloff = exp(-dist * 3.0);
    float bright = arms * falloff;

    float secondaryAngle = angle + logSpiral * 0.5 - uTime * uRotationSpeed * 1.3;
    float secondary = (sin(secondaryAngle * uArms * 2.0) * 0.5 + 0.5) * falloff * 0.35;
    bright = clamp(bright + secondary, 0.0, 1.0);

    float t1 = fract(dist * 2.0 + uTime * 0.1);
    vec3 gradient = mix(uColor1, uColor2, clamp(t1, 0.0, 1.0));
    gradient = mix(gradient, uColor3, clamp(t1 * t1, 0.0, 1.0));

    vec3 color = gradient * bright + gradient * 0.05;
    float alpha = clamp(bright + 0.02, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
}
