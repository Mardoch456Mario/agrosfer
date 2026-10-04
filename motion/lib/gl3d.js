// Rendu de plans texturés en perspective (WebGL2), composité ensuite dans le canvas 2D.
// Repère monde = pixels écran : x vers la droite, y vers le bas, z vers le fond. Le plan z = 0 correspond 1:1 à l'écran.
(() => {
  const VS = `#version 300 es
  in vec3 a_v; in vec2 a_uv;
  uniform vec3 u_s; // W, H, D
  out vec2 v_uv;
  void main(){
    v_uv = a_uv;
    gl_Position = vec4(2.0 * a_v.x * u_s.z / u_s.x, -2.0 * a_v.y * u_s.z / u_s.y, 0.0, a_v.z);
  }`;
  const FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; uniform sampler2D u_t; uniform float u_a; uniform vec3 u_tint; uniform float u_tintAmt;
  out vec4 o;
  void main(){
    vec4 c = texture(u_t, v_uv);
    c.rgb = mix(c.rgb, u_tint * c.a, u_tintAmt);
    o = c * u_a;
  }`;

  class Stage3D {
    constructor(W, H, fov = 32) {
      this.W = W;
      this.H = H;
      this.D = H / 2 / Math.tan(((fov / 2) * Math.PI) / 180);
      this.canvas = document.createElement('canvas');
      this.canvas.width = W;
      this.canvas.height = H;
      const gl = (this.gl = this.canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true, alpha: true }));
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const p = (this.prog = gl.createProgram());
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(p);
      gl.useProgram(p);
      this.loc = {
        v: gl.getAttribLocation(p, 'a_v'),
        uv: gl.getAttribLocation(p, 'a_uv'),
        s: gl.getUniformLocation(p, 'u_s'),
        a: gl.getUniformLocation(p, 'u_a'),
        tint: gl.getUniformLocation(p, 'u_tint'),
        tintAmt: gl.getUniformLocation(p, 'u_tintAmt'),
      };
      this.vbo = gl.createBuffer();
      this.ubo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.ubo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      this.cache = new Map();
    }

    // texture (mise en cache par objet source ; dynamic = ré-envoyée à chaque appel)
    // dynamic : true = ré-envoi à chaque appel ; nombre = version (ré-envoi seulement si elle change)
    texture(src, dynamic = false) {
      const gl = this.gl;
      let tex = this.cache.get(src);
      if (tex && (!dynamic || (typeof dynamic === 'number' && tex.version === dynamic))) return tex;
      if (!tex) {
        tex = gl.createTexture();
        this.cache.set(src, tex);
      }
      tex.version = dynamic;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      return tex;
    }

    clear() {
      const gl = this.gl;
      gl.viewport(0, 0, this.W, this.H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    // coins du plan après rotations (Y puis X puis Z, en degrés) autour de son centre (x, y, z)
    corners(o) {
      const w = o.w / 2;
      const h = o.h / 2;
      const [ry, rx, rz] = [o.ry || 0, o.rx || 0, o.rz || 0].map((d) => (d * Math.PI) / 180);
      const s = o.scale ?? 1;
      const pts = [
        [-w, -h],
        [w, -h],
        [w, h],
        [-w, h],
      ].map(([px, py]) => {
        let x = px * s;
        let y = py * s;
        let z = 0;
        // Z
        [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
        // X
        [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
        // Y
        [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
        return [x + o.x, y + o.y, z + (o.z || 0)];
      });
      // rotation de groupe optionnelle (ex. tout un mur de cartes) autour d'un pivot
      if (o.group) {
        const g = o.group;
        const [gy, gx, gz] = [(g.ry || 0) * Math.PI / 180, (g.rx || 0) * Math.PI / 180, (g.rz || 0) * Math.PI / 180];
        return pts.map(([x, y, z]) => {
          x -= g.x;
          y -= g.y;
          z -= g.z || 0;
          [x, y] = [x * Math.cos(gz) - y * Math.sin(gz), x * Math.sin(gz) + y * Math.cos(gz)];
          [y, z] = [y * Math.cos(gx) - z * Math.sin(gx), y * Math.sin(gx) + z * Math.cos(gx)];
          [x, z] = [x * Math.cos(gy) + z * Math.sin(gy), -x * Math.sin(gy) + z * Math.cos(gy)];
          return [x + g.x + (g.tx || 0), y + g.y + (g.ty || 0), z + (g.z || 0) + (g.tz || 0)];
        });
      }
      return pts;
    }

    plane(src, o) {
      const gl = this.gl;
      const tex = this.texture(src, o.dynamic);
      const c = this.corners(o).map(([x, y, z]) => [x - this.W / 2, y - this.H / 2, z + this.D]);
      if (c.some((p) => p[2] < 1)) return; // derrière la caméra
      const v = [c[0], c[1], c[2], c[0], c[2], c[3]].flat();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(this.loc.v);
      gl.vertexAttribPointer(this.loc.v, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.ubo);
      gl.enableVertexAttribArray(this.loc.uv);
      gl.vertexAttribPointer(this.loc.uv, 2, gl.FLOAT, false, 0, 0);
      gl.uniform3f(this.loc.s, this.W, this.H, this.D);
      gl.uniform1f(this.loc.a, o.alpha ?? 1);
      const tint = o.tint || [0, 0, 0];
      gl.uniform3f(this.loc.tint, tint[0], tint[1], tint[2]);
      gl.uniform1f(this.loc.tintAmt, o.tintAmt ?? 0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // projection d'un point monde -> écran (utile pour accrocher du 2D sur la 3D)
    project(x, y, z = 0) {
      const k = this.D / (z + this.D);
      return { x: this.W / 2 + (x - this.W / 2) * k, y: this.H / 2 + (y - this.H / 2) * k, k };
    }
  }

  window.Stage3D = Stage3D;
})();
