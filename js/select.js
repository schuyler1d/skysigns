/*
TODO:
  1. FEATURE: add 'copy' -- since duplicating is common
  2. upload: choose username, region
  3. saving

   NEED:
these need to be tagged in files/database
head? trunk? arm?
touch: contact/rub/hold/strike/brush?
motion: straight, circle, other
hand: shape (common confusions: a/s,b/open,g/L/bent,k/2,v/bent,1/x,6/w,f/open,m/3-closed)
motion: curl/uncurl, bend, piano
          
*/

Composer = function(){}
Composer.prototype = {
    opened_sections:{},
    current_shapes:{},
    id_suffix:0,
    init:function(si) {
        var self = this;
        this.si = si;
        jQuery('#composer-add').change(function(evt,ui) {
            var section = $(this).val();
            $(this).val('Add').selectmenu('refresh');
            setTimeout(function() {
                self.selectSection(section);
            },100);
        });
        this.view = new si.opts.viewer().init(null,'composer-canvas');
        jQuery('#composer-canvas').mousedown({self:this},this.placeGlyph);
        var x = jQuery('input,select','form.composer-custom')
            .change({self:this},this.customListener)
            .click({self:this},this.customListener)//for buttons
        return this;
    },
    customListener:function(evt) {
        var self = evt.data.self;
        var m = String(this.id).match(/^(\w+)-(\w+)/);
        var shobj = self.current_shape;
        if (shobj && m) {
            var section = m[1], 
                field = this.name,
                val = $(this).val();
            shobj.key = self.sections[section]
                .transforms[field](shobj.key,val);
            self.view.clearpure(shobj.shape_ctx);
            self.putShape(shobj.shape_ctx,shobj.key,function(k,s){
                shobj.shape = s;
            });
        }
    },
    placeGlyph:function(evt) {
        var self = evt.data.self;
        var pos = $(this).offset();
        if (self.current_shape) {
            self.current_shape.pos = {'x':evt.pageX-pos.left,
                                      'y':evt.pageY-pos.top
                                     };
            self.repaintCanvas();
        }
    },
    repaintCanvas:function() {
        //this.view.
        this.view.clearpure();//clear() messes up positioning
        for (var a in this.current_shapes) {
            var c = this.current_shapes[a];
            if (c.shape && c.pos) {
                this.view.insertShape(c.shape,c.pos.x,c.pos.y);
            }
        }
    },
    selectSection:function(section) {
        var self = this;
        this.switchShown(section+'-select');
        var sec = this.sections[section];
        if (!(section in this.opened_sections)) {
            this.createSymbolList($('#'+section+'-letterlist').get(0),
                                  sec.first,
                                  {size:sec.size,
                                   section:section,
                                   onclick:function(evt) {
                                       self.editNewShape(evt.data);
                                   }
                                  });
        }
    },
    createSymbolList:function(target,glyphs,opts) {
        var self = this;
        if (opts.section && ! this.opened_sections[opts.section]) {
            this.opened_sections[opts.section] = {};
        }
        var addAsync = function(g) {
            setTimeout(function() {
                self.addShape(g,target,opts);
            },100);
        }
        for (var i=0,l=glyphs.length;i<l;i++) {
            addAsync(glyphs[i]);
        }
    },
    putShape:function(ctx,key,cb) {
        var self = this;
        this.si.signs.getShape(key, function(s) {
            self.si.viewer.insertShape(s,0,0,'#000000',ctx);
            if (cb) cb(key,s);
        })
    },
    addShape:function(sym,list,opts) {
        var self = this;
        var shobj = {}; for (var a in opts) {shobj[a]=opts[a];}
        shobj.key = sym[1];
        var li = jQuery("<div class='glyph'>").appendTo(list).get(0);
        li.id = 'composer-glyph-'+(++self.id_suffix);
        if (sym[0]) $("<span>").appendTo(li).text(sym[0]);
        shobj.ctx = this.si.viewer.createContext(li,opts.size,opts.size,
                                                 shobj.key);
        this.putShape(shobj.ctx,shobj.key,function(k,s){
            shobj.shape = s;
        });
        if (opts.onclick) $(li).click(shobj,opts.onclick);
        return {dom:li,shape_ctx:shobj.ctx};
    },
    switchShown: function(id) {
        if (this.shown) this.shown.hide();
        return (this.shown = $('#'+id).show());
    },
    editNewShape:function(opts) {
        var self = this;
        var shobj;
        shobj = this.addShape([false,opts.key],
                                $('#current-shapes').get(0),
                                {size:50,
                                 onclick:function(evt){
                                     self.selectShape(this,shobj);
                                 }
                                });
        for (var a in opts) {shobj[a] = opts[a];}
        this.current_shapes[shobj.dom.id] = shobj;
        this.selectShape(shobj.dom,shobj);
    },
    refreshForm:function(form) {
        var chkradio = {checkbox:1,radio:1}
        form.reset();
        for (var a in form.elements) {
            var e = form.elements[a];
            if (e.tagName==='SELECT')
                jQuery(e).selectmenu("refresh");
            else if (e.type in chkradio)
                jQuery(e).checkboxradio("refresh");
        }
    },
    selectShape:function(dom,shobj) {
        //when someone selects one of the 'current-shapes' to re-edit
        var self = this;
        var new_shape = this.current_shapes[shobj.dom.id];
        var form_css = shobj.section+'-custom';
        if (this.current_shape != new_shape) {
            jQuery('#'+form_css).each(function(){self.refreshForm(this);});
            if (this.current_shape)
                $(this.current_shape.dom).removeClass('ui-btn-active');
        }
        this.current_shape = new_shape;
        $(dom).addClass('ui-btn-active')
        this.switchShown(form_css);
    },
    sections: {
        "hand":{
            "size":34, "ranges":['10000','20400'],
            "transforms":{
                'side':function(key,side){
                    var cur = parseInt(key[4],16);
                    var dig = ((side==='right') ? 0 : 8);
                    if (cur > 7) cur=cur-8;
                    return key.substr(0,4)+((cur+dig).toString(16));
                },
                'palm':function(key,palm) {
                    var cur = ((parseInt(key[3],16)>2)?3:0);
                    var p = {'back':0,'side':1,'away':2};
                    return (key.substr(0,3)+(cur+p[palm])+key.substr(4,1));
                },
                'orient':function(key,orient) { //broken fingers
                    var cur = parseInt(key[3],16) % 3;
                    var o = {'floor':3,'body':0};
                    return (key.substr(0,3)+(cur+o[orient])+key.substr(4,1));
                },
                'rotate':function(key,rot) {
                    if (rot==='rotate') rot = false;
                    var cur_rot = parseInt(key[4],16);
                    var cur = parseInt(cur_rot / 8,10);
                    //if no rot val, then shift-rotate 45deg
                    rot = (rot || cur_rot + 1) % 8;
                    return key.substr(0,4)+((cur+rot).toString(16));
                }
            },
            "first":[
                ['a','1f720'],['b','14720'],['c','16d20'],
                ['d','10128'],['e','14a20'],['f','1ce20'],
                ['g','1f000'],['h','11502'],
                ['i','19220'],
                ['k','14020'],['l','1dc20'],['m','18d20'],
                ['n','11920'],['o','17620'],['p','14021'],
                ['q','1f021'],['r','11a20'],['s','20320'],
                ['t','1fb20'],
                ['u','11520'], //redundant to h...
                ['v','10e20'],
                ['w','18720'], //redundant to 6
                ['x','10620'],['y','19a20'],
                ['1','10020'],['2','10e20'],['3','11e20'],
                ['4','14420'], //bug in symbol (svg, too)
                ['5','14c20'],['6','18720'],['7','1a520'],
                ['8','1bb20'],
                ['sick','1c500'],
                ['know','15a00'],
                ['applause','14c20'],
                ['rain','15050'],
                ['hard','11040'],
                ['moon','1ed10'],
                ['airplane','1cb21'],
                ['number','18510'],
                ['new','18220']
            ]
        },
        'context':{//head,trunk,limb
            'size':50, 'ranges':['2ff00','37eff'],
            "first":[
                //grep '^\(2ff\|30\)' entry_deps.txt  |head
                ['head','2ff00'],
                ['trunk','36d00'],
                ['chin','30004'],
                ['temple','30007'],
                ['cheek','30005'],
                ['ear','30006'],
                ['top','30000'], 
                ['tilt up','30300'],
                ['raise eyebrows','30a00'],
                ['concern','30e00'],
                ['mad','30c00']
            ]
        },
        'contact':{
            'size':30, 'ranges':['20500','21300'],
            'first':[
                //rotate
                ['contact','20500','twice','20600','thrice','20610'],
                ['hold','20800'],
                //rotate
                ['strike','20b00','twice','20c00','thrice','20c10'],
                ['brush','20e00'],
                ['touch between','20700'],//maybe combine inside contact/strike
            ]
        },
        'motion':{
            'size':30, 'ranges':['21400','2f7ff'],
            "transforms":{
                'side':function(key,side) {
                    
                }
            },
            'first': [
                /* conceptual categories:
                   straight: forward/up, left/right, toward/away body, *rotate
                   round, full circle, twist axis
                   straight,round,jagged,toward/away from body,arm,wrist,finger
                 */
                ['','22a00','22b00','22a14'],
                ['','26500'],
                ['','28900'],
                ['','2b700'],
                ['','2e300'],
                ['','2e700'],
                ['','2d500'],
                ['','29a00'],
                ['','2a200'],
                ['','2a800'],
                ['','24200'],
                ['','2e300'],
                ['finger','2f100'],
                ['curl','21600'],
                ['uncurl finger','21b00'],
                ['bend (back and forth)','22104'], //multiple,rotate
                //,['piano fingers','']
            ]
        },
        'modifiers':{
            'size':40, 'ranges':['2f700','2feff'],
            'first':[
                //http://std.dkuug.dk/jtc1/sc2/wg2/docs/n4090.pdf
                ['simultaneous','2fb04'], //rotate
                ['fast','2f700'],//< 
                ['slow','2f800'],//big arc
                ['tension','2f900'],//~
                ['relaxed','2fa00'],//outlined tilde
                ['every other time','2fd04'],//crossing arcs
                ['alternating','2fc04'],//stacked arcs
                ['gradual','2fe00'],//opposing arcs
            ]
        }
    }
}