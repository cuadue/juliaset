precision highp float;

attribute vec2 backdrop_pos;
varying vec2 v_plot_position;
uniform float u_zoom;
uniform vec2 u_scale;
uniform vec2 u_translation;

void main(void)
{
    vec2 translated = backdrop_pos - u_translation;
    gl_Position = vec4(translated * u_zoom * u_scale, 0, 1.0);
    v_plot_position = backdrop_pos;
}

