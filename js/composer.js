window.si.init(window.ss,window.sd,{
    base_path:'',
    storage:{
        paths:'sql',
        shapes:'sql'
    },
    viewer:CanvgViewer,
    loadpaths:true
});
var list = jQuery('#letterlist').get(0);
var letters = Composer.prototype.first;
for (var i=0,l=letters.length;i<l;i++) {
    addShape(letters[i],list);
}
var more = Composer.prototype.other;
for (var i=0,l=more.length;i<l;i++) {
    addShape(more[i],list);
}


function addShape(sym,list) {
    var key = sym[1];
    var li = jQuery("<li>").appendTo(list).get(0);
    var abc = jQuery("<span>").appendTo(li).text(sym[0]);
    var ctx = si.viewer.createContext(li,30,30,key);
    var putShape = function(ctx,key) {
        si.signs.getShape(key, function(s) {
            si.viewer.insertShape(s,0,0,'#000000',ctx);
        })
    }
    putShape(ctx,key);
}
