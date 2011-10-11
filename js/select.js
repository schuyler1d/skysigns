/*
TODO:
  if glyph paths are not loaded, then we need to load the full list.

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
        var shobj = this.addShape([false,opts.key],
                                $('#current-shapes').get(0),
                                {size:50,
                                 onclick:function(evt){
                                     self.selectShape(this,opts);
                                 }
                                });
        for (var a in shobj) {opts[a] = shobj[a];}
        this.current_shapes[opts.dom.id] = opts;
        this.selectShape(opts.dom,opts);
    },
    selectShape:function(dom,shobj) {
        //when someone selects one of the 'current-shapes' to re-edit
        if (this.current_shape) 
            $(this.current_shape.dom).removeClass('ui-btn-active');
        this.current_shape = this.current_shapes[shobj.dom.id];
        $(dom).addClass('ui-btn-active')
        this.switchShown(shobj.section+'-custom');
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
        'context':{
            'size':50, 'ranges':[],
            "first":[
                ['head','2ff00'],
                ['trunk','36d00']
            ]
        },
        'contact':{
            'size':30, 'ranges':[],
            'first':[
                ['contact','20500','twice','20600','thrice','20610'],//rotate
                ['hold','20800'],
                ['strike','20b00','twice','20c00','thrice','20c10'],//rotate
                ['brush','20e00'],
            ]
        },
        'motion':{
            'size':30, 'ranges':[],
            'first': [
                ['curl','21600'],
                ['uncurl finger','21b00'],
                ['bend (back and forth)','22104'] //multiple,rotate
                //,['piano fingers','']
            ]
        },
        'sequence':{
            'size':30, 'ranges':[],
            'first':[
                ['simultaneous','2fb00'] //rotate
            ]
        }
    }
}