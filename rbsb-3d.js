/* =========================================================
   RBSB EVENTS — lightweight 3D scenes (plain WebGL, no libraries)
   Usage:  <div class="rbsb-3d" data-model="discoball" data-min="900"></div>
   Models: discoball | balloons | cake | arch | gift | rings | coins
   - Only runs on large screens (data-min, default 1100px).
   - Pauses when off-screen or tab hidden; static frame if the visitor
     prefers reduced motion; silently disappears if WebGL is missing.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- tiny matrix helpers (column-major) ---------- */
  var M = {
    I: function () { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; },
    mul: function (a, b) {
      var o = new Array(16);
      for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
        var s = 0; for (var k = 0; k < 4; k++) s += a[k*4+r] * b[c*4+k];
        o[c*4+r] = s;
      }
      return o;
    },
    persp: function (f, a, n, fa) {
      var t = 1 / Math.tan(f / 2);
      return [t/a,0,0,0, 0,t,0,0, 0,0,(fa+n)/(n-fa),-1, 0,0,2*fa*n/(n-fa),0];
    },
    T: function (x, y, z) { return [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]; },
    S: function (x, y, z) { return [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]; },
    RX: function (a) { var c = Math.cos(a), s = Math.sin(a); return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]; },
    RY: function (a) { var c = Math.cos(a), s = Math.sin(a); return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]; },
    RZ: function (a) { var c = Math.cos(a), s = Math.sin(a); return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]; },
    chain: function () { var m = arguments[0]; for (var i = 1; i < arguments.length; i++) m = M.mul(m, arguments[i]); return m; },
    normal: function (m) {           // inverse-transpose of upper 3x3
      var a = [m[0],m[1],m[2]], b = [m[4],m[5],m[6]], c = [m[8],m[9],m[10]];
      function X(u, v) { return [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]; }
      var bc = X(b, c), ca = X(c, a), ab = X(a, b);
      var d = a[0]*bc[0] + a[1]*bc[1] + a[2]*bc[2]; d = d || 1;
      return [bc[0]/d,bc[1]/d,bc[2]/d, ca[0]/d,ca[1]/d,ca[2]/d, ab[0]/d,ab[1]/d,ab[2]/d];
    }
  };
  function hex(h) { return [parseInt(h.substr(1,2),16)/255, parseInt(h.substr(3,2),16)/255, parseInt(h.substr(5,2),16)/255]; }
  function fract(x) { return x - Math.floor(x); }

  var C = {
    teal: hex("#4fc3dc"), violet: hex("#8f83ea"), gold: hex("#e0b96e"), coral: hex("#ff6f91"),
    white: hex("#f6f9ff"), navy: hex("#14304f"), pink: hex("#ffb3c7"), mint: hex("#7be0c3"),
    silver: hex("#dfe6f0"), red: hex("#e63355"), cream: hex("#fff1de"), green: hex("#3fae7a")
  };
  var PALETTE = [C.teal, C.violet, C.gold, C.coral, C.mint, C.white];

  /* ---------- geometry builders ---------- */
  function sphere(seg, rings) {
    seg = seg || 32; rings = rings || 20;
    var p = [], n = [], i = [];
    for (var y = 0; y <= rings; y++) {
      var v = y / rings, th = v * Math.PI;
      for (var x = 0; x <= seg; x++) {
        var u = x / seg, ph = u * Math.PI * 2;
        var px = Math.cos(ph) * Math.sin(th), py = Math.cos(th), pz = Math.sin(ph) * Math.sin(th);
        p.push(px, py, pz); n.push(px, py, pz);
      }
    }
    for (y = 0; y < rings; y++) for (x = 0; x < seg; x++) {
      var a = y * (seg + 1) + x, b = a + seg + 1;
      i.push(a, b, a + 1, b, b + 1, a + 1);
    }
    return { p: p, n: n, i: i };
  }
  function cyl(rt, rb, h, seg) {
    seg = seg || 36;
    var p = [], n = [], i = [], k, a, c, s, slope = (rb - rt) / h, nl = Math.sqrt(1 + slope * slope);
    for (k = 0; k <= seg; k++) {
      a = k / seg * Math.PI * 2; c = Math.cos(a); s = Math.sin(a);
      p.push(c*rt, h/2, s*rt, c*rb, -h/2, s*rb);
      n.push(c/nl, slope/nl, s/nl, c/nl, slope/nl, s/nl);
    }
    for (k = 0; k < seg; k++) { var q = k * 2; i.push(q, q+1, q+2, q+1, q+3, q+2); }
    function cap(y, r, ny) {
      var base = p.length / 3; p.push(0, y, 0); n.push(0, ny, 0);
      for (var j = 0; j <= seg; j++) { var aa = j / seg * Math.PI * 2; p.push(Math.cos(aa)*r, y, Math.sin(aa)*r); n.push(0, ny, 0); }
      for (j = 0; j < seg; j++) { if (ny > 0) i.push(base, base+j+2, base+j+1); else i.push(base, base+j+1, base+j+2); }
    }
    if (rt > 0) cap(h/2, rt, 1);
    if (rb > 0) cap(-h/2, rb, -1);
    return { p: p, n: n, i: i };
  }
  function torus(R, r, segR, segr, arc) {
    segR = segR || 56; segr = segr || 18; arc = arc || Math.PI * 2;
    var p = [], n = [], i = [];
    for (var a = 0; a <= segR; a++) {
      var u = a / segR * arc, cu = Math.cos(u), su = Math.sin(u);
      for (var b = 0; b <= segr; b++) {
        var v = b / segr * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
        p.push((R + r*cv) * cu, (R + r*cv) * su, r * sv);
        n.push(cv * cu, cv * su, sv);
      }
    }
    for (a = 0; a < segR; a++) for (b = 0; b < segr; b++) {
      var q = a * (segr + 1) + b, w = q + segr + 1;
      i.push(q, w, q + 1, w, w + 1, q + 1);
    }
    return { p: p, n: n, i: i };
  }
  function box(x, y, z) {
    x /= 2; y /= 2; z /= 2;
    var faces = [
      [[1,0,0],[x,-y,-z],[x,y,-z],[x,y,z],[x,-y,z]], [[-1,0,0],[-x,-y,z],[-x,y,z],[-x,y,-z],[-x,-y,-z]],
      [[0,1,0],[-x,y,-z],[-x,y,z],[x,y,z],[x,y,-z]], [[0,-1,0],[-x,-y,z],[-x,-y,-z],[x,-y,-z],[x,-y,z]],
      [[0,0,1],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]], [[0,0,-1],[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]]
    ], p = [], n = [], i = [];
    faces.forEach(function (f, k) {
      for (var j = 1; j <= 4; j++) { p.push(f[j][0], f[j][1], f[j][2]); n.push(f[0][0], f[0][1], f[0][2]); }
      var o = k * 4; i.push(o, o+1, o+2, o, o+2, o+3);
    });
    return { p: p, n: n, i: i };
  }
  function flat(g) {                     // faceted look (gems)
    var p = [], n = [], i = [];
    for (var t = 0; t < g.i.length; t += 3) {
      var a = g.i[t]*3, b = g.i[t+1]*3, c = g.i[t+2]*3;
      var ux = g.p[b]-g.p[a], uy = g.p[b+1]-g.p[a+1], uz = g.p[b+2]-g.p[a+2];
      var vx = g.p[c]-g.p[a], vy = g.p[c+1]-g.p[a+1], vz = g.p[c+2]-g.p[a+2];
      var nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx, l = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
      [a, b, c].forEach(function (q) { p.push(g.p[q], g.p[q+1], g.p[q+2]); n.push(nx/l, ny/l, nz/l); i.push(i.length); });
    }
    return { p: p, n: n, i: i };
  }

  /* ---------- shaders ---------- */
  var VS = "attribute vec3 aPos;attribute vec3 aNor;uniform mat4 uVP;uniform mat4 uM;uniform mat3 uN;" +
    "varying vec3 vN;varying vec3 vW;void main(){vec4 w=uM*vec4(aPos,1.);vW=w.xyz;vN=uN*aNor;gl_Position=uVP*w;}";
  var FS = "precision mediump float;varying vec3 vN;varying vec3 vW;" +
    "uniform vec3 uCol,uCam,uEmis;uniform float uSpec,uShine,uRefl,uFacet,uAlpha,uTime;" +
    "vec3 env(vec3 d){float y=d.y*.5+.5;vec3 c=mix(vec3(.04,.10,.20),vec3(.62,.82,.98),y);" +
    "c+=vec3(1.,.92,.75)*pow(max(dot(d,normalize(vec3(.5,.7,.5))),0.),22.)*1.6;" +
    "c+=vec3(.45,.65,1.)*pow(max(dot(d,normalize(vec3(-.8,.2,.4))),0.),10.)*.9;" +
    "c+=vec3(1.,.5,.8)*pow(max(dot(d,normalize(vec3(.2,-.4,-.9))),0.),10.)*.5;return c;}" +
    "void main(){vec3 n=normalize(vN);float sp2=0.;float col_tint=1.;" +
    "if(uFacet>.5){vec3 q=floor(n*9.+.5);n=normalize(q/9.+1e-4);" +
    "float h=fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);sp2=smoothstep(.9,1.,fract(h+uTime*.3))*1.3;col_tint=.6+.5*h;}" +
    "vec3 v=normalize(uCam-vW);vec3 l=normalize(vec3(.5,.8,.6));" +
    "float df=max(dot(n,l),0.);vec3 amb=mix(vec3(.13,.15,.24),vec3(.40,.47,.60),n.y*.5+.5);" +
    "vec3 hv=normalize(l+v);float sp=pow(max(dot(n,hv),0.),uShine)*uSpec;" +
    "float fr=pow(1.-max(dot(n,v),0.),3.);vec3 r=reflect(-v,n);" +
    "vec3 col=uCol*(amb+df*vec3(1.,.96,.88)*.95)+sp+uEmis;" +
    "vec3 e=env(r)*mix(vec3(1.),uCol,.65)*col_tint;col=mix(col,e+sp,uRefl);" +
    "col+=fr*vec3(.45,.72,1.)*.28+sp2;" +
    "gl_FragColor=vec4(col*uAlpha,uAlpha);}";

  /* ---------- renderer ---------- */
  function Renderer(canvas) {
    var gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) return null;
    this.gl = gl; this.canvas = canvas;
    function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error("link");
    gl.useProgram(pr); this.pr = pr;
    this.loc = {};
    var self = this;
    ["uVP","uM","uN","uCol","uCam","uEmis","uSpec","uShine","uRefl","uFacet","uAlpha","uTime"].forEach(function (u) { self.loc[u] = gl.getUniformLocation(pr, u); });
    this.aPos = gl.getAttribLocation(pr, "aPos"); this.aNor = gl.getAttribLocation(pr, "aNor");
    gl.enableVertexAttribArray(this.aPos); gl.enableVertexAttribArray(this.aNor);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.geo = {}; this.cam = [0, 0.6, 8]; this.VP = M.I(); this.time = 0;
  }
  Renderer.prototype.make = function (name, g) {
    if (this.geo[name]) return this.geo[name];
    var gl = this.gl, mk = function (arr, tgt, Ctor) { var b = gl.createBuffer(); gl.bindBuffer(tgt, b); gl.bufferData(tgt, new Ctor(arr), gl.STATIC_DRAW); return b; };
    return (this.geo[name] = {
      p: mk(g.p, gl.ARRAY_BUFFER, Float32Array), n: mk(g.n, gl.ARRAY_BUFFER, Float32Array),
      i: mk(g.i, gl.ELEMENT_ARRAY_BUFFER, Uint16Array), count: g.i.length
    });
  };
  Renderer.prototype.begin = function (w, h, view) {
    var gl = this.gl;
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var P = M.persp(0.62, w / h, 0.1, 60);
    var d = this.cam[2] * Math.max(1, 0.8 / (w / h));
    var V = M.chain(M.T(0, -0.2, -d), M.RX(0.12));
    this.VP = M.mul(P, V);
    gl.uniform3f(this.loc.uCam, 0, 0.6 + 0.12 * d, d);
    gl.uniform1f(this.loc.uTime, this.time);
    this.root = view;
  };
  /* draw geometry `g` with material `m` and model matrix */
  Renderer.prototype.draw = function (g, m, model) {
    var gl = this.gl, L = this.loc, mm = M.mul(this.root, model);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.p); gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.n); gl.vertexAttribPointer(this.aNor, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.i);
    gl.uniformMatrix4fv(L.uVP, false, new Float32Array(this.VP));
    gl.uniformMatrix4fv(L.uM, false, new Float32Array(mm));
    gl.uniformMatrix3fv(L.uN, false, new Float32Array(M.normal(mm)));
    var c = m.col || C.white, e = m.emis || [0, 0, 0], a = m.alpha == null ? 1 : m.alpha;
    gl.uniform3f(L.uCol, c[0], c[1], c[2]); gl.uniform3f(L.uEmis, e[0], e[1], e[2]);
    gl.uniform1f(L.uSpec, m.spec == null ? 0.5 : m.spec); gl.uniform1f(L.uShine, m.shine || 40);
    gl.uniform1f(L.uRefl, m.refl || 0); gl.uniform1f(L.uFacet, m.facet ? 1 : 0); gl.uniform1f(L.uAlpha, a);
    if (a < 1) gl.depthMask(false);
    gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_SHORT, 0);
    if (a < 1) gl.depthMask(true);
  };

  /* ---------- scenes ---------- */
  var SCENES = {};

  /* Disco ball + confetti + orbit rings (login / sign-up) */
  SCENES.discoball = function (R) {
    var sph = R.make("sph", sphere(40, 28)), cy = R.make("cy", cyl(1, 1, 1, 32)),
        bx = R.make("bx", box(1, 1, 1)), tor = R.make("tor", torus(1, 0.012, 96, 8));
    var conf = []; for (var i = 0; i < 46; i++) conf.push([fract(Math.sin(i * 12.9) * 4375.5), fract(Math.sin(i * 7.3) * 951.2), fract(Math.sin(i * 3.1) * 7731.7), fract(Math.sin(i * 5.9) * 311.4)]);
    return function (t) {
      R.draw(cy, { col: C.silver, refl: .6, spec: 1 }, M.chain(M.T(0, 3.4, 0), M.S(.012, 3.2, .012)));
      R.draw(cy, { col: C.silver, refl: .9, spec: 1, shine: 90 }, M.chain(M.T(0, 1.62, 0), M.S(.16, .18, .16)));
      R.draw(sph, { col: C.silver, refl: .95, spec: 1, shine: 120, facet: 1 }, M.chain(M.T(0, .2, 0), M.RY(t * .55), M.S(1.42, 1.42, 1.42)));
      for (var k = 0; k < conf.length; k++) {
        var s = conf[k], a = s[0] * 6.283 + t * (.25 + s[1] * .25), rad = 1.7 + s[1] * 1.0;
        var y = 2.8 - ((s[2] * 5.6 + t * (.35 + s[3] * .45)) % 5.6);
        R.draw(bx, { col: PALETTE[k % PALETTE.length], spec: .8, shine: 60 },
          M.chain(M.T(Math.cos(a) * rad, y, Math.sin(a) * rad * .8), M.RY(t * 2 + k), M.RX(t * 1.6 + k * 2), M.S(.17, .02, .1)));
      }
      var rings = [[C.teal, .5, 1.85, 0], [C.violet, 1.1, 2.1, 1.2], [C.gold, -.7, 2.35, 2.4]];
      rings.forEach(function (r) {
        R.draw(tor, { col: r[0], emis: r[0], alpha: .75, spec: 0 }, M.chain(M.RX(1.2 + r[1] * .35), M.RZ(r[1] + t * .12 * (r[1] > 0 ? 1 : -1)), M.S(r[2], r[2], r[2])));
      });
    };
  };

  /* Balloon bouquet tied to a gift (home) */
  SCENES.balloons = function (R) {
    var sph = R.make("sph", sphere(32, 22)), cone = R.make("cone", cyl(0, 1, 1, 16)), cy = R.make("cy", cyl(1, 1, 1, 12)),
        bx = R.make("bx", box(1, 1, 1)), tor = R.make("tor", torus(1, .22, 32, 12));
    var B = [[-1.5, 1.2, C.coral, 0], [-0.1, 2.2, C.teal, 1.3], [1.4, 1.35, C.gold, 2.1], [-.6, .1, C.violet, 3.2], [.9, .05, C.mint, 4.4]];
    var anchor = [0, -2.45];
    return function (t) {
      R.draw(bx, { col: C.violet, spec: .8, shine: 70 }, M.chain(M.T(0, -2.85, 0), M.RY(t * .5), M.S(1.3, .9, 1.3)));
      R.draw(bx, { col: C.gold, spec: .9, shine: 80, refl: .25 }, M.chain(M.T(0, -2.85, 0), M.RY(t * .5), M.S(1.34, .9, .2)));
      R.draw(bx, { col: C.gold, spec: .9, shine: 80, refl: .25 }, M.chain(M.T(0, -2.85, 0), M.RY(t * .5), M.S(.2, .9, 1.34)));
      R.draw(tor, { col: C.gold, spec: 1, refl: .3 }, M.chain(M.T(0, -2.35, 0), M.RY(t * .5), M.RX(1.57), M.S(.28, .28, .28)));
      B.forEach(function (b, i) {
        var sway = Math.sin(t * .9 + b[3]) * .09, bob = Math.sin(t * .7 + b[3]) * .14;
        var x = b[0] + Math.sin(t * .6 + b[3]) * .12, y = b[1] + bob;
        var kx = x + sway * 1.2, ky = y - .86;
        var dx = anchor[0] - kx, dy = anchor[1] - ky, L = Math.sqrt(dx * dx + dy * dy);
        R.draw(cy, { col: C.white, spec: .2 }, M.chain(M.T(kx + dx / 2, ky + dy / 2, 0), M.RZ(Math.atan2(-dx, dy)), M.S(.012, L, .012)));
        R.draw(sph, { col: b[2], spec: 1.1, shine: 55, refl: .22 }, M.chain(M.T(x, y, 0), M.RZ(sway), M.S(.72, .88, .72)));
        R.draw(cone, { col: b[2], spec: .4 }, M.chain(M.T(kx, ky - .02, 0), M.RZ(Math.PI + sway), M.S(.14, .16, .14)));
      });
    };
  };

  /* Three-tier celebration cake (events) */
  SCENES.cake = function (R) {
    var cy = R.make("cy", cyl(1, 1, 1, 48)), sph = R.make("sph", sphere(20, 14)), tor = R.make("tor", torus(1, .075, 64, 12));
    var tiers = [[1.55, .85, -1.2, C.pink], [1.1, .75, -.4, C.cream], [.7, .65, .35, C.teal]];
    return function (t) {
      var rot = M.RY(t * .45);
      R.draw(cy, { col: C.silver, refl: .8, spec: 1 }, M.chain(M.T(0, -1.75, 0), M.S(2.2, .12, 2.2)));
      tiers.forEach(function (T, k) {
        R.draw(cy, { col: T[3], spec: .7, shine: 50 }, M.chain(M.T(0, T[2], 0), rot, M.S(T[0], T[1], T[0])));
        R.draw(tor, { col: C.white, spec: .9, shine: 60 }, M.chain(M.T(0, T[2] + T[1] / 2, 0), rot, M.RX(1.5708), M.S(T[0], T[0], 1)));
        var n = 18 + k * 2;
        for (var j = 0; j < n; j++) {
          var a = j / n * 6.283;
          R.draw(sph, { col: C.white, spec: 1.2, shine: 90, refl: .3 }, M.chain(rot, M.T(Math.cos(a) * (T[0] + .02), T[2] - T[1] / 2 + .09, Math.sin(a) * (T[0] + .02)), M.S(.07, .07, .07)));
        }
      });
      for (var j = 0; j < 8; j++) {
        var a = j / 8 * 6.283;
        R.draw(sph, { col: C.red, spec: 1.3, shine: 80, refl: .18 }, M.chain(rot, M.T(Math.cos(a) * .52, .72, Math.sin(a) * .52), M.S(.12, .12, .12)));
      }
      for (j = 0; j < 5; j++) {
        a = j / 5 * 6.283 + .4; var cx = Math.cos(a) * .22, cz = Math.sin(a) * .22;
        R.draw(cy, { col: PALETTE[j % 5], spec: .6 }, M.chain(rot, M.T(cx, .98, cz), M.S(.045, .5, .045)));
        var fl = 1 + Math.sin(t * 9 + j * 2) * .15;
        R.draw(sph, { col: C.gold, emis: [1, .78, .3], alpha: .95, spec: 0 }, M.chain(rot, M.T(cx, 1.36, cz), M.S(.06 * fl, .13 * fl, .06 * fl)));
      }
    };
  };

  /* Floral wedding / event arch with chandelier (venues) */
  SCENES.arch = function (R) {
    var cy = R.make("cy", cyl(1, 1, 1, 28)), sph = R.make("sph", sphere(16, 12)), gem = R.make("gem", flat(sphere(6, 4))),
        arc = R.make("arc", torus(1.6, .09, 64, 14, Math.PI)), bx = R.make("bx", box(1, 1, 1)), tor = R.make("tor", torus(1, .03, 48, 8));
    return function (t) {
      var sw = M.RY(Math.sin(t * .35) * .55 - .15);
      [-1.6, 1.6].forEach(function (x) {
        R.draw(cy, { col: C.white, spec: .8, shine: 70 }, M.chain(sw, M.T(x, -.2, 0), M.S(.15, 3.4, .15)));
        R.draw(cy, { col: C.gold, spec: 1, refl: .4 }, M.chain(sw, M.T(x, -1.95, 0), M.S(.28, .12, .28)));
        R.draw(cy, { col: C.gold, spec: 1, refl: .4 }, M.chain(sw, M.T(x, 1.5, 0), M.S(.24, .1, .24)));
        for (var k = 0; k < 12; k++) {
          R.draw(sph, { col: C.green, spec: .3 }, M.chain(sw, M.T(x + (k % 2 ? .12 : -.12), -1.7 + k * .27, .05), M.S(.17, .1, .13)));
          R.draw(sph, { col: k % 3 === 0 ? C.coral : k % 3 === 1 ? C.pink : C.white, spec: 1, shine: 40 }, M.chain(sw, M.T(x + (k % 2 ? -.1 : .1), -1.62 + k * .27, .12), M.S(.12, .12, .12)));
        }
      });
      R.draw(arc, { col: C.white, spec: .8 }, M.chain(sw, M.T(0, 1.55, 0)));
      for (var j = 0; j <= 16; j++) {
        var a = j / 16 * Math.PI, c = j % 3 === 0 ? C.coral : j % 3 === 1 ? C.pink : C.white;
        R.draw(sph, { col: c, spec: 1, shine: 50 }, M.chain(sw, M.T(Math.cos(a) * 1.6, 1.55 + Math.sin(a) * 1.6, 0), M.S(.17, .17, .17)));
        R.draw(sph, { col: C.green, spec: .3 }, M.chain(sw, M.T(Math.cos(a) * 1.6, 1.55 + Math.sin(a) * 1.6 - .02, .12), M.S(.14, .05, .1)));
      }
      var sway = Math.sin(t * .8) * .06;
      R.draw(cy, { col: C.gold, spec: .8 }, M.chain(sw, M.T(0, 2.95, 0), M.S(.012, .7, .012)));
      R.draw(tor, { col: C.gold, spec: 1, refl: .5 }, M.chain(sw, M.T(0, 2.25 + sway, 0), M.RX(1.5708), M.S(.5, .5, .5)));
      for (j = 0; j < 8; j++) {
        a = j / 8 * 6.283 + t * .3;
        R.draw(gem, { col: C.white, refl: .9, spec: 1, facet: 0 }, M.chain(sw, M.T(Math.cos(a) * .5, 2.0 + sway, Math.sin(a) * .5), M.RY(t + j), M.S(.07, .15, .07)));
        R.draw(sph, { col: C.gold, emis: [1, .85, .45], alpha: .95, spec: 0 }, M.chain(sw, M.T(Math.cos(a) * .5, 2.34 + sway, Math.sin(a) * .5), M.S(.05, .07, .05)));
      }
      R.draw(cy, { col: C.navy, spec: .9, shine: 80, refl: .35 }, M.chain(sw, M.T(0, -2.08, 0), M.S(2.7, .14, 1.3)));
    };
  };

  /* Gift box with floating lid, bow and sparkles (services) */
  SCENES.gift = function (R) {
    var bx = R.make("bx", box(1, 1, 1)), tor = R.make("tor", torus(1, .24, 40, 14)), sph = R.make("sph", sphere(20, 14));
    return function (t) {
      var spin = M.RY(t * .45), hop = Math.abs(Math.sin(t * 1.1)) * .35;
      R.draw(bx, { col: C.teal, spec: .9, shine: 60, refl: .12 }, M.chain(M.T(0, -.7, 0), spin, M.S(2.3, 1.9, 2.3)));
      R.draw(bx, { col: C.gold, spec: 1, refl: .35 }, M.chain(M.T(0, -.7, 0), spin, M.S(.42, 1.94, 2.34)));
      R.draw(bx, { col: C.gold, spec: 1, refl: .35 }, M.chain(M.T(0, -.7, 0), spin, M.S(2.34, 1.94, .42)));
      R.draw(bx, { col: C.violet, spec: .9, shine: 60 }, M.chain(M.T(0, .5 + hop, 0), spin, M.S(2.55, .5, 2.55)));
      R.draw(bx, { col: C.gold, spec: 1, refl: .35 }, M.chain(M.T(0, .52 + hop, 0), spin, M.S(.42, .54, 2.59)));
      R.draw(bx, { col: C.gold, spec: 1, refl: .35 }, M.chain(M.T(0, .52 + hop, 0), spin, M.S(2.59, .54, .42)));
      R.draw(tor, { col: C.gold, spec: 1, refl: .4 }, M.chain(M.T(0, .95 + hop, 0), spin, M.T(-.42, 0, 0), M.RX(1.2), M.RY(.5), M.S(.5, .8, .5)));
      R.draw(tor, { col: C.gold, spec: 1, refl: .4 }, M.chain(M.T(0, .95 + hop, 0), spin, M.T(.42, 0, 0), M.RX(1.2), M.RY(-.5), M.S(.5, .8, .5)));
      R.draw(sph, { col: C.gold, spec: 1, refl: .4 }, M.chain(M.T(0, .98 + hop, 0), spin, M.S(.2, .2, .2)));
      for (var k = 0; k < 7; k++) {
        var a = k / 7 * 6.283 + t * .4, p = .6 + .4 * Math.sin(t * 2.4 + k * 1.7), r = 2.2 + (k % 3) * .35;
        var X = Math.cos(a) * r, Y = 1.2 + Math.sin(a * 1.3 + k) * 1.1, Z = Math.sin(a) * r * .5, s = .22 * p, e = PALETTE[k % PALETTE.length];
        R.draw(bx, { col: e, emis: e, spec: 0 }, M.chain(M.T(X, Y, Z), M.RZ(t + k), M.S(s, s * .16, s * .16)));
        R.draw(bx, { col: e, emis: e, spec: 0 }, M.chain(M.T(X, Y, Z), M.RZ(t + k), M.S(s * .16, s, s * .16)));
      }
    };
  };

  /* Interlocked wedding rings with a diamond (about) */
  SCENES.rings = function (R) {
    var tor = R.make("tor", torus(1.25, .22, 72, 24)), gem = R.make("gem", flat(sphere(8, 5))), sph = R.make("sph", sphere(12, 8));
    return function (t) {
      var spin = M.chain(M.RY(t * .5), M.RX(Math.sin(t * .4) * .2));
      R.draw(tor, { col: C.gold, spec: 1.2, shine: 110, refl: .75 }, M.chain(spin, M.T(-.62, 0, 0), M.RX(1.5708 - .35)));
      R.draw(tor, { col: C.silver, spec: 1.2, shine: 110, refl: .85 }, M.chain(spin, M.T(.62, 0, 0), M.RX(1.5708 + .35), M.RY(.2)));
      R.draw(gem, { col: C.white, spec: 1.6, shine: 150, refl: .9 }, M.chain(spin, M.T(-.62, 1.3, .22), M.RY(t * 1.2), M.S(.34, .44, .34)));
      for (var k = 0; k < 9; k++) {
        var a = k / 9 * 6.283 + t * .3, rr = 2.6 + (k % 3) * .25;
        var e = PALETTE[k % PALETTE.length];
        R.draw(sph, { col: e, emis: e, alpha: .85, spec: 0 }, M.chain(M.T(Math.cos(a) * rr, Math.sin(a * 1.4 + k) * 1.4, Math.sin(a) * rr * .5), M.S(.06, .06, .06)));
      }
    };
  };

  /* Coin stack with flipping coin (budget) */
  SCENES.coins = function (R) {
    var cy = R.make("cy", cyl(1, 1, 1, 48)), tor = R.make("tor", torus(1, .05, 48, 10)), sph = R.make("sph", sphere(14, 10));
    var gold = { col: C.gold, spec: 1.2, shine: 90, refl: .6 };
    function coin(model) { R.draw(cy, gold, M.chain(model, M.S(1, .2, 1))); R.draw(tor, { col: hex("#caa04e"), spec: 1, refl: .5 }, M.chain(model, M.T(0, .1, 0), M.RX(1.5708))); }
    return function (t) {
      var rot = M.RY(t * .35);
      for (var k = 0; k < 8; k++) coin(M.chain(rot, M.T(Math.sin(k * 2.1) * .08, -2 + k * .21, Math.cos(k * 1.3) * .08), M.RY(k * .6), M.S(1.05, 1, 1.05)));
      var fy = 0.6 + Math.sin(t * 1.2) * .25;
      coin(M.chain(M.T(0, fy, 0), M.RX(t * 1.6), M.RZ(.3), M.S(1.05, 1, 1.05)));
      for (k = 0; k < 4; k++) {
        var a = k / 4 * 6.283 + t * .8, ry = Math.sin(t + k * 1.6) * .8 + .5;
        coin(M.chain(M.T(Math.cos(a) * 2.1, ry, Math.sin(a) * 1.1), M.RX(t * 2 + k), M.RY(t + k), M.S(.38, 1, .38)));
      }
      R.draw(sph, { col: C.navy, emis: [.05, .22, .3], alpha: .6, spec: 0 }, M.chain(M.T(0, -2.1, 0), M.S(2.4, .05, 2.4)));
    };
  };

  SCENES.discoball.dist = 11; SCENES.balloons.dist = 13.5; SCENES.cake.dist = 12.5; SCENES.arch.dist = 12.5;
SCENES.gift.dist = 13; SCENES.rings.dist = 11.5; SCENES.coins.dist = 11.5;

/* ---------- mounting ---------- */
  function mount(el) {
    var model = el.getAttribute("data-model"), min = parseInt(el.getAttribute("data-min") || "1100", 10);
    if (!SCENES[model]) return;
    var mq = window.matchMedia("(min-width: " + min + "px)");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canvas = null, R = null, scene = null, raf = 0, visible = true, t0 = 0, px = 0, py = 0, tx = 0, ty = 0, failed = false;

    function start() {
      if (failed || canvas) return;
      canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      el.appendChild(canvas);
      try {
        R = new Renderer(canvas);
        if (!R) throw new Error("no webgl");
        R.cam[2] = SCENES[model].dist || 12; scene = SCENES[model](R);
      } catch (e) { failed = true; teardown(); el.parentNode && el.parentNode.classList.remove("has-3d"); return; }
      el.parentNode && el.parentNode.classList.add("has-3d");
      canvas.addEventListener("webglcontextlost", function (ev) { ev.preventDefault(); stop(); failed = true; teardown(); });
      t0 = performance.now(); size(); loop();
    }
    function teardown() { if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); canvas = null; R = null; }
    function stop() { cancelAnimationFrame(raf); raf = 0; }
    function size() {
      if (!canvas) return;
      var d = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(2, Math.round(el.clientWidth * d)), h = Math.max(2, Math.round(el.clientHeight * d));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    function frame(now) {
      if (!R) return;
      px += (tx - px) * .06; py += (ty - py) * .06;
      var t = reduce ? 2.4 : (now - t0) / 1000;
      R.time = t; size();
      R.begin(canvas.width, canvas.height, M.chain(M.RY(px * .5), M.RX(py * .25)));
      scene(t);
    }
    function loop(now) {
      raf = 0;
      if (!R) return;
      frame(now || performance.now());
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(loop);
    }
    function wake() { if (R && !raf && visible && !document.hidden) raf = requestAnimationFrame(loop); }

    function check() { if (mq.matches) { start(); wake(); } else { stop(); teardown(); el.parentNode && el.parentNode.classList.remove("has-3d"); } }
    if (mq.addEventListener) mq.addEventListener("change", check); else mq.addListener(check);
    window.addEventListener("resize", function () { if (R) { size(); if (reduce) loop(); } });
    document.addEventListener("visibilitychange", wake);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) wake(); else stop(); }).observe(el);
    window.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
    }, { passive: true });
    check();
  }

  function init() { var els = document.querySelectorAll(".rbsb-3d[data-model]"); for (var i = 0; i < els.length; i++) mount(els[i]); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
