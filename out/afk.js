'use strict';const ld=(0,w)("#chunkPattern",HTMLCanvasElement);ld.width=512;ld.height=512;const md=(0,w)("#patternLog"),nd=(0,kb)(ld.getContext("2d"),CanvasRenderingContext2D),Y=new Map,od=["#fff","#ddd"];for(let a=0;16>a;a++)for(let b=0;16>b;b++)nd.fillStyle=od[b&1^a&1],nd.fillRect(32*b,32*a,32,32);
for(let a=0;512>a;a++)for(let b=0;512>b;b++){const c=[];for(let e=-8;8>=e;e++)for(let f=-8;8>=f;f++){const g=a/512-(f+.5),h=b/512-(e+.5);c.push(64>g*g+h*h?"1":"0")}const d=BigInt(`0b${c.reverse().join("")}`);Y.has(d)?Y.get(d).push({x:a,z:b}):Y.set(d,[{x:a,z:b}])}for(const a of Y.keys())for(const b of Y.keys())a!==b&&(a&b)===a&&(Y.get(a).length=0);let pd=Y.keys().next().value,qd=Y.keys().next().value;for(const a of Y.keys())pd&=a,qd|=a,0===Y.get(a).length&&Y.delete(a);
console.log("common",pd.toString(16),"neverSeen",qd.toString(16));function rd(a){let b=0;for(;0n!==a;)b+=Number(a&1n),a>>=1n;return b}const sd=[],td=new Map;
for(const [a,b]of Y.entries()){const c=`#${Math.floor(16777215*Math.random()).toString(16)}`;td.set(a,c);nd.fillStyle=c;let d=0,e=0;for(const {x:v,z:q}of b)nd.fillRect(v,q,1,1),d+=v,e+=q;const f=d/b.length,g=e/b.length;let h=1E9,k=0,y=0;for(const {x:v,z:q}of b){const z=f-v,G=g-q,B=z*z+G*G;B<h&&(h=B,k=v,y=q)}sd.push({x:k/512,z:y/512});console.log("Best point for",a,k/512,y/512,rd(a),"in range")}console.log("best points",sd);console.log(Y);const ud=Array.from(Y.keys());
ud.sort((a,b)=>{let c=512,d=512;for(const {x:f,z:g}of Y.get(a))f<c&&(c=f),g<d&&(d=g);let e=a=512;for(const {x:f,z:g}of Y.get(b))f<a&&(a=f),g<e&&(e=g);return d===e?c-a:d-e});
for(const a of ud){const b=document.createElement("span"),c=td.get(a);b.textContent=`${rd(a)}\n`;b.style.color=c;b.addEventListener("mouseenter",()=>{nd.fillStyle="red";let d=void 0,e=0;for(const {x:f,z:g}of Y.get(a))void 0===d&&(d=f,e=g),nd.fillRect(f,g,1,1);vd(d,e)});b.addEventListener("mouseleave",()=>{nd.fillStyle=c;for(const {x:d,z:e}of Y.get(a))nd.fillRect(d,e,1,1)});md.appendChild(b)}const wd=(0,w)("#hoverInfo"),yd=new Fc("#chunkPatternMap");yd.u=!0;
ld.addEventListener("mousemove",a=>{const b=ld.getBoundingClientRect();vd((a.clientX-b.left)/(b.right-b.left)*512,(a.clientY-b.top)/(b.bottom-b.top)*512)},{passive:!0});function vd(a,b){let c=pd,d=qd;for(let f=-8;8>=f;f++)for(let g=-8;8>=g;g++){var e=a/512-(g+.5);const h=b/512-(f+.5);e=64>e*e+h*h;Dc(yd,g,f,c&1n?"#abd9e9":d&1n?e?"#2c7bb6":"#ddd":"#999");c>>=1n;d>>=1n}Dc(yd,0,0,"yellow");yd.u=!0;wd.textContent=`x:${(a/512*16).toFixed(2)} z:${(b/512*16).toFixed(2)}`}(0,w)("#loading").style.display="none";
//# sourceMappingURL=afk.js.map
