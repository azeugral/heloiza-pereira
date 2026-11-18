/* Heloiza Pereira — "da foto para a pele".
   A foto real que o tutor mandou fica no porta-retrato; pinceladas de grafite que nascem nos olhos
   deixam no lugar a tatuagem dela, alinhada olho com olho. WebGL1, um quadro 4:5. */
(function () {
  const PETS = [
    { id: 'amora', nome: 'Amora' },
    { id: 'collie', nome: 'Border collie' },
    { id: 'gamora', nome: 'Gamora' },
    { id: 'fred', nome: 'Frederico' },
    { id: 'siames', nome: 'Siamês' }
  ];
  const CICLO = 5.2, INI = .55;
  const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  /* estado no instante t (s): pet atual, mistura da foto sobre a tattoo anterior e progresso das pinceladas */
  function estado(t) {
    t += INI;
    const n = Math.floor(t / CICLO), k = n % PETS.length, l = t - n * CICLO;
    return { k, ant: (k + PETS.length - 1) % PETS.length, a: n === 0 ? 1 : sm(l / .5), p: sm((l - .75) / 1.7) * 1.06 };
  }
  window.HELO = { PETS, CICLO, estado };

  const VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  const FS = `precision mediump float;varying vec2 uv;
  uniform sampler2D uAnt,uFoto,uTat,uMapa;uniform float uA,uP;
  void main(){
    vec3 ant=texture2D(uAnt,uv).rgb, foto=texture2D(uFoto,uv).rgb, tat=texture2D(uTat,uv).rgb;
    float v=texture2D(uMapa,uv).r;
    float a=clamp((uP-v)/.03,0.,1.);
    vec3 c=mix(mix(ant,foto,uA),tat,a);
    float frente=a*(1.-a)*4.;
    c=mix(c,c*.7,frente*.55);
    gl_FragColor=vec4(c,1.);
  }`;
  function sh(gl, t, s) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o); return o; }

  /* fotoHero(canvas, imgs) -> {desenha(t)} ; imgs[id] = {f,t,m} Image */
  window.fotoHero = function (cv, imgs) {
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) return null;
    const P = gl.createProgram();
    gl.attachShader(P, sh(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(P, sh(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(P); if (!gl.getProgramParameter(P, gl.LINK_STATUS)) return null;
    gl.useProgram(P);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(P, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    function tex(im) {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    const T = PETS.map(p => ({ f: tex(imgs[p.id].f), t: tex(imgs[p.id].t), m: tex(imgs[p.id].m) }));
    const U = n => gl.getUniformLocation(P, n);
    ['uAnt', 'uFoto', 'uTat', 'uMapa'].forEach((n, i) => gl.uniform1i(U(n), i));
    const uA = U('uA'), uP = U('uP');
    function bind(i, t) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); }
    return {
      desenha(t, dpr) {
        const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
        if (w && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; }
        gl.viewport(0, 0, cv.width, cv.height);
        const e = estado(t);
        bind(0, T[e.ant].t); bind(1, T[e.k].f); bind(2, T[e.k].t); bind(3, T[e.k].m);
        gl.uniform1f(uA, e.a); gl.uniform1f(uP, e.p);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return e;
      }
    };
  };
})();
