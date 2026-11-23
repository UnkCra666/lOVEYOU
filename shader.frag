uniform float uTime,uGlide,uHue,uBass;
uniform vec2 uResolution,uMouse;
#define MAX_STEPS 48
#define MAX_DIST 28.0
#define SECTORS 6.0
#define Z_PERIOD 4.0
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hash3(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);
 return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float smin(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
float smax(float a,float b,float k){return -smin(-a,-b,k);}
float map(vec3 p,out float orbit,float rt){
 float axialR=length(p.xy);
 float zEvo=p.z*0.11;
 float ang=6.2831853/SECTORS;
 float a=atan(p.y,p.x+1e-4);
 a=abs(mod(a,ang)-ang*0.5);
 p.xy=vec2(cos(a),sin(a))*length(p.xy);
 p.z=mod(p.z,Z_PERIOD)-Z_PERIOD*0.5;
 p.x-=2.0;
 float lod=0.0;
 if(lod>0.01){
  vec3 wp=p*1.6+vec3(0.0,0.0,uTime*0.15);
  float w1=vnoise(wp)-0.5;float w2=vnoise(wp+11.3)-0.5;
  p.xy+=vec2(w1,w2)*(0.085*lod);
  float w3=vnoise(p*0.6+vec3(0.0,0.0,uTime*0.08))-0.5;
  p.xy+=w3*(0.06*lod);
 }
 float kz=3.0*6.2831853/Z_PERIOD;
 p.x+=sin(p.z*kz-uTime)*0.04;
 vec3 texP=p;float scale=1.0;orbit=1e9;
 float dC=1e9,dM=1e9,dF=1e9,dV=1e9,dU=1e9;
 mat2 rYZ=rot(0.42+0.22*sin(zEvo));
 mat2 rXZ=rot(-0.23+0.22*cos(zEvo*1.1));
 vec3 off=vec3(2.1+0.22*sin(zEvo*0.7),1.35,0.95+0.18*cos(zEvo));
 for(int i=0;i<7;i++){
  p=abs(p);
  if(p.x<p.y)p.xy=p.yx;
  if(p.x<p.z)p.xz=p.zx;
  p.yz*=rYZ;p.xz*=rXZ;
  p=p*2.0-off;scale*=2.0;
  orbit=min(orbit,length(p));
  if(i==2)dC=(length(p.xy)-(0.34+0.10*sin(zEvo*0.8)))/scale;
  if(i==4)dM=(length(p.xy)-(0.22+0.07*sin(zEvo*1.3+1.0)))/scale;
  if(i==6)dF=(length(p.xy)-(0.12+0.04*sin(zEvo*2.1)))/scale;
   }
 float d=smin(dC,dM,0.20);d=smin(d,dF,0.11);
 if(lod>0.01)d-=(vnoise(texP*7.0+vec3(0.0,0.0,uTime*0.1))-0.5)*(0.008*lod);
 d=smax(d,0.5-axialR,0.3);
 return d;
}
void main(){
 vec2 uv=(gl_FragCoord.xy*2.0-uResolution)/uResolution.y;
 vec3 ro=vec3(0.0,0.0,uGlide);
 vec3 rd=normalize(vec3(uv+uMouse*0.35,1.5));
 rd.xy*=rot(uTime*0.012);
 float t=0.0,steps=0.0,orbit=0.0,o;
 for(int i=0;i<MAX_STEPS;i++){
  vec3 pos=ro+rd*t;
  float d=map(pos,o,t);
  orbit=o;
  if(d<0.0012*(1.0+t)||t>MAX_DIST)break;
  t+=d*0.78;steps+=1.0;
 }
 float ao=1.0-steps/float(MAX_STEPS);
 vec3 frost=vec3(0.88,0.93,0.965);
 vec3 ink=vec3(0.20,0.26,0.34);
 float breath=0.85+0.15*sin(uTime*0.63)+uBass*0.45;
 vec3 col=mix(ink,frost,pow(ao,2.2));
 col+=vec3(0.35,0.55,0.75)*exp(-orbit*1.5)*0.25*breath;
 col+=frost*0.18*exp(-orbit*7.0);
 float fog=1.0-exp(-t*0.075);
 col=mix(col,frost,fog*0.5);
 vec2 axisUV=uv+uMouse*0.35;
 float shaft=exp(-abs(axisUV.x)*9.0)*exp(-abs(axisUV.y)*0.9);
 float axis=length(axisUV);
 col+=frost*0.16*exp(-axis*4.0)*breath;
 col+=frost*0.85*shaft*(0.3+0.7*fog)*breath;
 col=max(col,ink*0.55);
 float core=exp(-axis*9.0);
 col=mix(col,frost,core);

 float h=uHue+fog*0.25+axis*0.12;
 vec3 rainbow=0.5+0.5*cos(6.2831853*(h+vec3(0.0,0.3333,0.6667)));
 float lum=dot(col,vec3(0.299,0.587,0.114));
 vec3 tint=rainbow*(lum*1.25+0.04);
 col=mix(col,tint,0.8);

 col=clamp(col,vec3(0.0),vec3(0.96));
 gl_FragColor=vec4(col,1.0);
}
