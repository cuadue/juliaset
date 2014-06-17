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
    var args = Array.prototype.slice.call(arguments);
    return function () {
        return fn.apply(this, args.concat(Array.prototype.slice.call(arguments)));
    }
}

function set_default_args(args, defaults) {
    var ret = {};
    for (key in defaults)
        ret[key] = args.hasOwnProperty(key) ? args[key] : defaults[key];
    return ret;
}

function juliaset(canvas_id, frag_id, vertex_id) {
    var canvas = document.getElementById(canvas_id);
    if (!canvas) return;
    var gl = get_webgl(canvas);

    var req_anim_frame = window.requestAnimationFrame ||
                         window.mozRequestAnimationFrame ||
                         window.webkitRequestAnimationFrame ||
                         window.msRequestAnimationFrame;

    if (!req_anim_frame) return;

    function shader_object(id) {
        var elem = document.getElementById(id);
        if (!elem) throw 'Failed finding element ' + id;

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
            alert ('Failed making a program?');
            return;
        }

        for (var i = 0; i < arguments.length; i++) {
            var shader = arguments[i];
            if (!shader) {
                console.log('Shader ' + i + ' is null');
                return;
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
        var vertices_arr;

        function buffer_data(vs, buffer_usage) {
            if (vs.length % args.item_size != 0) {
                throw 'Invalid array length';
            }
            vertices_arr = new Float32Array(vs);
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

            var num_elems = Math.floor(vertices_arr.length / args.item_size);
            gl.drawArrays(args.array_mode, 0, num_elems);

            if (vs) {
                gl.deleteBuffer(buffer);
            }
        }
    }

    function uniform1f_setter(program, name) {
        var loc = gl.getUniformLocation(program, name);
        return function set_uniform1f(v) {
            gl.uniform1f(loc, v);
        }
    }

    var frag_shader = shader_object(frag_id);
    var vertex_shader = shader_object(vertex_id);
    var program = shader_program(frag_shader, vertex_shader);

    var set_zoom = uniform1f_setter(program, 'u_zoom');

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

    function draw() {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIG | gl.DEPTH_BUFFER_BIT);
        set_zoom(0.5);
        draw_backdrop();

        req_anim_frame(draw);
    }

    draw();
}

