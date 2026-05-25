(function () {
  'use strict';
  var canvas = document.querySelector('.hero-gl');
  if (!canvas) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var gl;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'low-power' })
      || canvas.getContext('experimental-webgl');
  } catch (e) { gl = null; }
  if (!gl) return;

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res; uniform float u_t; uniform vec2 u_sun;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.0;float a=0.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);',
    ' for(int i=0;i<6;i++){v+=a*noise(p);p=m*p;a*=0.5;}return v;}',
    'vec3 sky(float t){',
    ' vec3 c=vec3(0.035,0.105,0.078);',
    ' c=mix(c,vec3(0.055,0.180,0.120),smoothstep(0.00,0.22,t));',
    ' c=mix(c,vec3(0.100,0.330,0.190),smoothstep(0.18,0.40,t));',
    ' c=mix(c,vec3(0.260,0.520,0.260),smoothstep(0.40,0.55,t));',
    ' c=mix(c,vec3(0.620,0.450,0.180),smoothstep(0.54,0.68,t));',
    ' c=mix(c,vec3(0.880,0.600,0.220),smoothstep(0.66,0.78,t));',
    ' c=mix(c,vec3(0.960,0.780,0.360),smoothstep(0.78,0.89,t));',
    ' c=mix(c,vec3(0.970,0.910,0.760),smoothstep(0.90,1.00,t));',
    ' return c;}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/u_res.xy;',
    ' float asp=u_res.x/u_res.y;',
    ' float t=1.0-uv.y;',
    ' vec3 col=sky(t);',
    ' vec2 sd=vec2((uv.x-u_sun.x)*asp,(uv.y-u_sun.y));',
    ' float d=length(sd);',
    ' vec2 cp=vec2(uv.x*asp,uv.y);',
    ' float cl1=fbm(cp*2.2+vec2(u_t*0.018,u_t*0.004));',
    ' float cl2=fbm(cp*4.6-vec2(u_t*0.03,0.0));',
    ' float band=smoothstep(0.27,0.55,uv.y)*(1.0-smoothstep(0.62,0.93,uv.y));',
    ' float clouds=smoothstep(0.46,0.96,cl1*0.7+cl2*0.4);',
    ' col=mix(col,vec3(1.0,0.86,0.62),clouds*band*0.5);',
    ' col+=vec3(1.0,0.80,0.50)*cl2*band*0.08;',
    ' float halo=exp(-d*2.0)*0.7+exp(-d*5.0)*0.9;',
    ' col+=vec3(1.0,0.86,0.50)*halo;',
    ' col+=vec3(1.0,0.95,0.70)*exp(-d*9.0)*0.6;',
    ' float disc=smoothstep(0.094,0.080,d);',
    ' col=mix(col,vec3(1.0,0.98,0.90),disc);',
    ' float ang=atan(sd.y,sd.x);',
    ' float rays=(0.5+0.5*sin(ang*30.0+u_t*0.18))*(0.5+0.5*sin(ang*13.0-u_t*0.10));',
    ' rays*=smoothstep(0.70,0.05,d);',
    ' col+=vec3(1.0,0.90,0.62)*rays*0.08;',
    ' col*=mix(0.70,1.0,smoothstep(0.0,0.42,uv.y));',
    ' col*=mix(0.82,1.0,smoothstep(1.25,0.30,length((uv-0.5)*vec2(asp,1.0))));',
    ' col+=(hash(uv*u_res.xy+u_t)-0.5)*0.018;',
    ' gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'u_res');
  var uT = gl.getUniformLocation(prog, 'u_t');
  var uSun = gl.getUniformLocation(prog, 'u_sun');
  gl.uniform2f(uSun, 0.60, 0.70);

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  var start = performance.now(), raf = 0, visible = true;
  function frame(now) {
    gl.uniform1f(uT, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce && visible) raf = requestAnimationFrame(frame);
  }
  var hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !reduce) raf = requestAnimationFrame(frame);
      else cancelAnimationFrame(raf);
    }, { threshold: 0 }).observe(hero);
  }
  requestAnimationFrame(frame);
  canvas.classList.add('ready');
})();
