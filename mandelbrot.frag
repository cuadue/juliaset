precision highp float;

varying vec2 v_plot_position;

float sqr(float x) {
    return x * x;
}

const int max_iter = 1000;
const float saturation = 0.8, luminance = 0.8;

vec3 hsl_to_rgb(float h, float s, float l)
{
    h = h * 360.0 / 60.0;

    float h_mod_2 = h;

    // This is h % 2.0 for 0 <= h < 60 since (I think) GLSL requires a
    // constant number of iterations in any loop.
    for (int i = 0; i < 30; i++) if (h_mod_2 > 2.0) h_mod_2 -= 2.0;

    float c = s * s * (1.0 - abs(l - 1.0));
    float x = c * (1.0 - abs(h_mod_2 - 1.0));

    int ih = int(h);

    if (ih == 0) return vec3(c, x, 0);
    if (ih == 1) return vec3(x, c, 0);
    if (ih == 2) return vec3(0, c, x);
    if (ih == 3) return vec3(0, x, c);
    if (ih == 4) return vec3(x, 0, c);
    if (ih == 5) return vec3(c, 0, x);
    return vec3(0, 0, 0);
}

float mandelbrot_escape_time(float x0, float y0)
{
    float x = 0.0, y = 0.0;

    int num_iter = 0;
    for (int i = 0; i < max_iter; i++) {
        float xtmp = sqr(x) - sqr(y) + x0;
        y = 2.0 * x * y + y0;
        x = xtmp;

        num_iter++;

        if (sqr(x) + sqr(y) > 2.0) {
            break;
        }
    }
    return float(num_iter) / float(max_iter);
}

void main(void)
{
    float x0 = v_plot_position.x;
    float y0 = v_plot_position.y;

    float h = mandelbrot_escape_time(x0, y0);
    gl_FragColor = vec4(hsl_to_rgb(h, saturation, luminance), 1);
}

