// Cursor Blaze - purple explosion edition
// Based on https://gist.github.com/chardskarth/95874c54e29da6b5a36ab7b50ae2d088
// Particle system and glow effects added for maximum drama

// --- Hashing / pseudo-random ---
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// --- Easing ---
float ease(float x) {
    return pow(1.0 - x, 6.0);
}

// --- SDF helpers (Inigo Quilez) ---
float getSdfRectangle(in vec2 p, in vec2 xy, in vec2 b) {
    vec2 d = abs(p - xy) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float seg(in vec2 p, in vec2 a, in vec2 b, inout float s, float d) {
    vec2 e = b - a;
    vec2 w = p - a;
    vec2 proj = a + e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    float segd = dot(p - proj, p - proj);
    d = min(d, segd);
    float c0 = step(0.0, p.y - a.y);
    float c1 = 1.0 - step(0.0, p.y - b.y);
    float c2 = 1.0 - step(0.0, e.x * w.y - e.y * w.x);
    float allCond = c0 * c1 * c2;
    float noneCond = (1.0 - c0) * (1.0 - c1) * (1.0 - c2);
    float flip = mix(1.0, -1.0, step(0.5, allCond + noneCond));
    s *= flip;
    return d;
}

float getSdfParallelogram(in vec2 p, in vec2 v0, in vec2 v1, in vec2 v2, in vec2 v3) {
    float s = 1.0;
    float d = dot(p - v0, p - v0);
    d = seg(p, v0, v3, s, d);
    d = seg(p, v1, v0, s, d);
    d = seg(p, v2, v1, s, d);
    d = seg(p, v3, v2, s, d);
    return s * sqrt(d);
}

vec2 normalize(vec2 value, float isPosition) {
    return (value * 2.0 - (iResolution.xy * isPosition)) / iResolution.y;
}

float blend(float t) {
    float sqr = t * t;
    return sqr / (2.0 * (sqr - t) + 1.0);
}

float antialising(float distance) {
    return 1.0 - smoothstep(0.0, normalize(vec2(2.0, 2.0), 0.0).x, distance);
}

float determineStartVertexFactor(vec2 a, vec2 b) {
    float condition1 = step(b.x, a.x) * step(a.y, b.y);
    float condition2 = step(a.x, b.x) * step(b.y, a.y);
    return 1.0 - max(condition1, condition2);
}

vec2 getRectangleCenter(vec4 rectangle) {
    return vec2(rectangle.x + (rectangle.z / 2.0), rectangle.y - (rectangle.w / 2.0));
}

// --- Colors ---
const vec4 TRAIL_COLOR        = vec4(0.494, 0.451, 0.98, 1.0);  // indigo
const vec4 TRAIL_COLOR_ACCENT = vec4(0.31, 0.275, 0.898, 1.0);  // deep indigo
const vec4 BURST_HOT          = vec4(0.75, 0.45, 1.0, 1.0);     // bright violet
const vec4 BURST_CORE         = vec4(0.95, 0.85, 1.0, 1.0);     // near-white lavender
const vec4 DUST_COLOR         = vec4(0.55, 0.35, 0.95, 1.0);    // purple dust
const vec4 SPARK_COLOR        = vec4(0.85, 0.7, 1.0, 1.0);      // pale lilac sparks

// --- Tuning ---
const float DURATION        = 0.8;
const float DRAW_THRESHOLD  = 0.0;
const int   NUM_PARTICLES   = 12;
const float PARTICLE_SPEED  = 0.35;
const float PARTICLE_SIZE   = 0.003;
const float PARTICLE_LIFE   = 0.7;
const int   NUM_DUST        = 0;
const float DUST_SPEED      = 0.15;
const float DUST_SIZE       = 0.008;
const float DUST_LIFE       = 1.0;
const float GLOW_RADIUS     = 0.04;
const float GLOW_INTENSITY  = 0.25;

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    #if !defined(WEB)
    fragColor = texture(iChannel0, fragCoord.xy / iResolution.xy);
    #endif

    vec2 vu = normalize(fragCoord, 1.0);
    vec2 offsetFactor = vec2(-0.5, 0.5);

    vec4 currentCursor  = vec4(normalize(iCurrentCursor.xy, 1.0),  normalize(iCurrentCursor.zw, 0.0));
    vec4 previousCursor = vec4(normalize(iPreviousCursor.xy, 1.0), normalize(iPreviousCursor.zw, 0.0));

    vec2 centerCC = getRectangleCenter(currentCursor);
    vec2 centerCP = getRectangleCenter(previousCursor);
    float lineLength = distance(centerCC, centerCP);
    float cursorSize = max(currentCursor.z, currentCursor.w);

    float elapsed  = iTime - iTimeCursorChange;
    float progress = blend(clamp(elapsed / DURATION, 0.0, 1.0));
    float easedProgress = ease(progress);

    // --- Parallelogram trail (original, intensified) ---
    float vertexFactor = determineStartVertexFactor(currentCursor.xy, previousCursor.xy);
    float invertedVertexFactor = 1.0 - vertexFactor;

    vec2 v0 = vec2(currentCursor.x  + currentCursor.z * vertexFactor,         currentCursor.y  - currentCursor.w);
    vec2 v1 = vec2(currentCursor.x  + currentCursor.z * invertedVertexFactor,  currentCursor.y);
    vec2 v2 = vec2(previousCursor.x + currentCursor.z * invertedVertexFactor,  previousCursor.y);
    vec2 v3 = vec2(previousCursor.x + currentCursor.z * vertexFactor,          previousCursor.y - previousCursor.w);

    vec4 newColor = fragColor;

    bool isFarEnough = lineLength > DRAW_THRESHOLD * cursorSize;
    if (isFarEnough) {
        // Trail
        float distanceToEnd = distance(vu.xy, centerCC);
        float alphaModifier = clamp(distanceToEnd / max(lineLength * easedProgress, 0.001), 0.0, 1.0);

        float sdfCursor = getSdfRectangle(vu, currentCursor.xy - (currentCursor.zw * offsetFactor), currentCursor.zw * 0.5);
        float sdfTrail  = getSdfParallelogram(vu, v0, v1, v2, v3);

        newColor = mix(newColor, TRAIL_COLOR_ACCENT, 1.0 - smoothstep(sdfTrail, -0.01, 0.001));
        newColor = mix(newColor, TRAIL_COLOR, antialising(sdfTrail));
        newColor = mix(fragColor, newColor, 1.0 - alphaModifier);
        fragColor = mix(newColor, fragColor, step(sdfCursor, 0.0));

        // --- Particle burst (sharp sparks radiating outward) ---
        float t = clamp(elapsed / PARTICLE_LIFE, 0.0, 1.0);
        for (int i = 0; i < NUM_PARTICLES; i++) {
            float fi = float(i);
            float angle = hash11(fi * 7.13) * 6.2831853;
            float speed = PARTICLE_SPEED * (0.4 + 0.6 * hash11(fi * 3.71));
            float life  = 0.3 + 0.7 * hash11(fi * 11.3);

            // Particles spawn along the trail, not just at the cursor
            float spawnT = hash11(fi * 5.17);
            vec2 spawnPos = mix(centerCP, centerCC, spawnT);

            vec2 dir = vec2(cos(angle), sin(angle));
            // Add some bias in the direction of cursor travel
            vec2 travelDir = (lineLength > 0.001) ? (centerCC - centerCP) / lineLength : vec2(0.0);
            dir = dir + travelDir * 0.5 * hash11(fi * 2.31);
            dir = (length(dir) > 0.0) ? dir / length(dir) : dir;

            vec2 particlePos = spawnPos + dir * speed * t * life;

            // Wobble
            particlePos += vec2(sin(elapsed * 12.0 + fi), cos(elapsed * 10.0 + fi * 1.3)) * 0.003;

            float dist = distance(vu, particlePos);
            float size = PARTICLE_SIZE * (1.0 - t * 0.7);
            float alpha = smoothstep(size, size * 0.2, dist) * (1.0 - t) * (1.0 - t);

            // Alternate colors per particle
            vec3 pColor = mix(BURST_HOT.rgb, SPARK_COLOR.rgb, hash11(fi * 9.77));
            fragColor.rgb = mix(fragColor.rgb, pColor, alpha * 0.8);
        }

        // --- Dust cloud (softer, larger, slower blobs) ---
        float td = clamp(elapsed / DUST_LIFE, 0.0, 1.0);
        for (int i = 0; i < NUM_DUST; i++) {
            float fi = float(i);
            float angle = hash11(fi * 13.37 + 100.0) * 6.2831853;
            float speed = DUST_SPEED * (0.3 + 0.7 * hash11(fi * 4.19 + 50.0));

            float spawnT = hash11(fi * 8.53 + 200.0);
            vec2 spawnPos = mix(centerCP, centerCC, spawnT);

            vec2 dir = vec2(cos(angle), sin(angle));
            vec2 dustPos = spawnPos + dir * speed * td;

            // Gravity-like drift downward
            dustPos.y -= 0.02 * td * td;

            float dist = distance(vu, dustPos);
            float size = DUST_SIZE * (1.0 + td * 0.5);
            float alpha = exp(-dist * dist / (size * size)) * (1.0 - td * td);

            vec3 dColor = mix(DUST_COLOR.rgb, TRAIL_COLOR.rgb, hash11(fi * 6.66 + 77.0));
            fragColor.rgb = mix(fragColor.rgb, dColor, alpha * 0.35);
        }
    }
}
