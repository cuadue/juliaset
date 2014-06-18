function call(fn) { return fn(); }

function get_webgl(canvas) {
    try {
        return canvas.getContext('webgl') ||
               canvas.getContext('experimental-webgl');
    }
    catch (e) { return null; }
}

Function.prototype.curry = function () {
    var fn = this;
    var stored = Array.prototype.slice.call(arguments);
    return function () {
        var args = stored.concat(Array.prototype.slice.call(arguments));
        return fn.apply(this, args);
    }
}

function set_default_args(args, defaults) {
    var ret = {};
    for (key in defaults)
        ret[key] = args.hasOwnProperty(key) ? args[key] : defaults[key];
    return ret;
}

function element_by_id(id) {
    var ret = document.getElementById(id);
    if (ret)
        return ret;
    else 
        throw 'Failed finding element with ID ' + ret;
}

function juliaset(canvas_id, frag_id, vertex_id) {
    var canvas = element_by_id(canvas_id);
    var gl = get_webgl(canvas);

    var req_anim_frame = window.requestAnimationFrame ||
                         window.mozRequestAnimationFrame ||
                         window.webkitRequestAnimationFrame ||
                         window.msRequestAnimationFrame;

    if (!req_anim_frame) return;

    function shader_object(id) {
        var elem = element_by_id(id);

        var shader_type;

        if (elem.type.match(/x-fragment/i)) {
            shader_type = gl.FRAGMENT_SHADER;
        }
        else if (elem.type.match(/x-vertex/i)) {
            shader_type = gl.VERTEX_SHADER;
        }
        else {
            throw 'Unknown shader type ' + elem.type;
        }
        
        var obj = gl.createShader(shader_type);
        gl.shaderSource(obj, elem.innerHTML);
        gl.compileShader(obj);

        if (!gl.getShaderParameter(obj, gl.COMPILE_STATUS)) {
            throw "Error compiling shader: " + gl.getShaderInfoLog(obj);
        }

        return obj;
    }

    function shader_program() {
        var program = gl.createProgram();
        if (!program) {
            throw 'Failed making a program';
        }

        for (var i = 0; i < arguments.length; i++) {
            var shader = arguments[i];
            if (!shader) {
                throw 'Shader ' + i + ' is null';
            }
            gl.attachShader(program, arguments[i]);
        }

        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.log(gl.getProgramInfoLog(program));
            throw 'Failed linking shader program';
        }

        return program;
    }

    function vertex_attrib(args) {
        args = set_default_args(args, {
            program: {},
            name: '',
            item_size: 0,
            array_mode: gl.TRIANGLES,
            vertices: []
        });

        var loc = gl.getAttribLocation(args.program, args.name);

        if (loc < 0) {
            throw 'Failed finding attribute ' + name;
        }

        gl.enableVertexAttribArray(loc);

        var buffer = gl.createBuffer();
        var vertices_arr, num_elems;

        function buffer_data(vs, buffer_usage) {
            if (vs.length % args.item_size != 0) {
                throw 'Invalid array length ' + vs.length;
            }

            vertices_arr = new Float32Array(vs);
            num_elems = Math.floor(vertices_arr.length / args.item_size);

            buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices_arr, buffer_usage);
        }

        if (args.vertices) {
            buffer_data(args.vertices, gl.STATIC_DRAW);
        }

        return function vertex_attrib_draw(vs) {
            if (vs) {
                buffer_data(vs, gl.DYNAMIC_DRAW);
            }

            if (!vertices_arr) {
                throw "No vertex data";
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.vertexAttribPointer(loc, args.item_size, gl.FLOAT, false, 0, 0);
            gl.drawArrays(args.array_mode, 0, num_elems);
        }
    }

    function uniform_setter(gl_func_suffix, uniform_name) {
        var func_name = 'uniform' + gl_func_suffix;
        var func = gl[func_name];
        if (!func) {
            throw 'Could not find gl function ' + func_name;
        }

        var loc = gl.getUniformLocation(program, uniform_name);
        if (!loc) {
            throw 'Could not find uniform named ' + uniform_name;
        }

        // The value of `this` needs to be the gl object, hence the `bind`
        return func.curry(loc).bind(gl);
    }

    var frag_shader = shader_object(frag_id);
    var vertex_shader = shader_object(vertex_id);
    var program = shader_program(frag_shader, vertex_shader);

    var set_zoom = uniform_setter('1f', 'u_zoom');
    var set_scale = uniform_setter('2f', 'u_scale');
    var set_translation = uniform_setter('2f', 'u_translation');

    var draw_backdrop = vertex_attrib({
        program: program,
        name: 'backdrop_pos',
        item_size: 2,
        array_mode: gl.TRIANGLE_STRIP,
        vertices: [
             1,  1,
            -1,  1,
             1, -1,
            -1, -1]
    });

    gl.useProgram(program);

    var global_zoom = .5;
    var global_center = {x: 0, y: 0};
    var aspect_ratio;

    function draw() {
        // Why do I have to do this?? It removes some awful aliasing artifacts,
        // and fixes the aspect ratio.
        var w = gl.canvas.clientWidth;
        var h = gl.canvas.clientHeight;
        canvas.height = h;
        canvas.width = w;
        gl.viewport(0, 0, w, h);
        aspect_ratio = w / h
        set_scale(1, aspect_ratio);

        gl.clearColor(0.5, 0.5, 0.5, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        set_zoom(global_zoom);
        set_translation(global_center.x, global_center.y);

        draw_backdrop();

        req_anim_frame(draw);
    }

    draw();

    call(function () {
        var mouse_start;
        var center_start;

        function click_loc(elem, event) {
            var elem_rect = elem.getBoundingClientRect();
            return {
                x: event.clientX - elem_rect.left,
                y: event.clientY - elem_rect.top
            }
        }

        canvas.onmousedown = function canvas_onmousedown(event) {
            if (mouse_start || center_start) return;
            mouse_start = click_loc(canvas, event);
            center_start = { x: global_center.x, y: global_center.y };
        };

        function logxy(pre, xy) {
            console.log(pre + ': ' + xy.x + ', ' + xy.y);
        }

        canvas.onmousemove = function canvas_onmousemove(event) {
            if (!center_start) return;

            mouse = click_loc(canvas, event);

            var w = canvas.width;
            var h = canvas.height;
            var dx = mouse_start.x - mouse.x;
            var dy = mouse_start.y - mouse.y;

            global_center = {
                x: center_start.x + dx / global_zoom / w,
                y: center_start.y - dy / global_zoom / h * aspect_ratio
            }
        };

        function screen_coords_to_plot(center, sx, sy) {
            var w = canvas.width;
            var h = canvas.height;
            sy = h - sy;
            return {
                x: (sx / w - 0.5) / global_zoom + center.x,
                y: (sy / h - 0.5) * aspect_ratio / global_zoom + center.y
            }
        }

        canvas.onmouseup = function canvas_onmouseup(event) {
            if (mouse_start && center_start) {
                mouse = click_loc(canvas, event);

                var w = canvas.width;
                var h = canvas.height;

                var dx = mouse_start.x - mouse.x;
                var dy = mouse_start.y - mouse.y;

                var p = screen_coords_to_plot(center_start, mouse.x, mouse.y);

                if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
                    // Click
                    global_center = { x: p.x, y: p.y };
                    console.log('Moving absolute center');
                }
            }

            mouse_start = null;
            center_start = null;
        };
    });
}

