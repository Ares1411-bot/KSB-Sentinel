// No dependencies: assemble the PLC closure fragments and copy static sources.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),src=path.join(root,'src'),dist=path.join(root,'dist');
const read=p=>fs.readFileSync(path.join(src,p),'utf8');
function write(p,text){const target=path.join(dist,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);}
function copy(from,to){write(to,read(from));}
for(const name of ['session','hierarchy','shell','event-timeline'])copy('shared/'+name+'.js','shared/js/'+name+'.js');
for(const name of ['base','design-system','shell'])copy('shared/styles/'+name+'.css','shared/styles/'+name+'.css');
const shell=read('shared/shell.html');
for(const module of ['plc','alerts'])write(module+'/index.html',read(module+'/page.html').replace('<!--SHARED_SHELL-->',shell));
const modules=JSON.parse(read('plc/modules.json'));
write('plc/app.js','// Generated from src/plc/modules/*.js; edit the source fragments.\n(() => {\n'+modules.map(name=>read('plc/modules/'+name)).join('\n')+'\n})();\n');
for(const name of ['events','records-view','alerts-link','expanded-trends','point-help'])copy('plc/'+name+'.js','plc/'+name+'.js');
copy('plc/demo-data.js','plc/data/demo-data.js');
for(const name of ['dashboard','management','components','records'])copy('plc/styles/'+name+'.css','plc/styles/'+name+'.css');
for(const name of ['app','runtime','data-views','pump-demo','source-fields'])copy('alerts/'+name+'.js','alerts/'+name+'.js');
copy('alerts/demo-data.js','alerts/data/demo-data.js');copy('alerts/styles/alert-center.css','alerts/styles/alert-center.css');
copy('alerts/phm-pump-feedbacks.json','alerts/data/phm-pump-feedbacks.json');
console.log('Built independent PLC and alert-center prototypes.');

// Remove the obsolete screenshot output after migrating to native SVG views.
fs.rmSync(path.join(dist,'alerts/assets'),{recursive:true,force:true});
