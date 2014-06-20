precision highp float;

uniform sampler2D u_color_map;
varying vec2 v_plot_position;

float sqr(float x) {
    return x * x;
}

const int max_iter = 1000;

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
    gl_FragColor = texture2D(u_color_map, vec2(1.0 - h, 0.5));
}

