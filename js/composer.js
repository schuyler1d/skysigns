if (!window.si.db) {
    window.si.init(window.ss,window.sd,{
        base_path:'',
        storage:{
            paths:'sql',
            shapes:'sql'
        },
        viewer:CanvgViewer,
        loadpaths:true
    });
}

console.log('composer.js loading');

$('#composer-page').live('pagecreate',function(event,ui){
    var list = jQuery('#letterlist').get(0);
    for (a in Composer.prototype) {
        var glyphs = Composer.prototype[a];
        for (var i=0,l=glyphs.length;i<l;i++) {
            addShape(glyphs[i],list);
        }
    }
});


function putShape(ctx,key) {
    si.signs.getShape(key, function(s) {
        si.viewer.insertShape(s,0,0,'#000000',ctx);
    })
}

function addShape(sym,list) {
    var key = sym[1];
    var li = jQuery("<li>").appendTo(list).get(0);
    var abc = jQuery("<span>").appendTo(li).text(sym[0]);
    var ctx = si.viewer.createContext(li,30,30,key);
    putShape(ctx,key);
    jQuery(li).click(function(evt) {
        console.log(key);
    });
}
