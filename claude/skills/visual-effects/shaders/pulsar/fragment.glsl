precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uFrequency;
uniform float uDecay;
uniform float uSpeed;
uniform vec3 uColorStart;
uniform vec3 uColorEnd;

void main() {
    vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
    float dist = length(uv);

    float phase = dist * uFrequency - uTime * uSpeed;
    float wave = sin(phase) * 0.5 + 0.5;

    float envelope = exp(-dist * uDecay);
    wave *= envelope;

    float secondaryPhase = dist * uFrequency * 1.618 - uTime * uSpeed * 0.7;
    float secondary = (sin(secondaryPhase) * 0.5 + 0.5) * envelope * 0.4;
    wave = clamp(wave + secondary, 0.0, 1.0);

    vec3 color = mix(uColorEnd, uColorStart, wave);
    color *= (1.0 + wave * 0.6);

    float alpha = envelope;
    gl_FragColor = vec4(color * alpha, alpha);
}
