/*
TODO:
  0. List 'my additions' -- maybe right by upload 
  1. FEATURE: add 'copy' -- since duplicating is common
  2. upload: choose username, region
      - 'after curation, we'd like to be able to potentially 
         add signs to the public dictionary, is that ok?'
      - ask on first entry into create new
  3. saving: if no entry#, then tag as created,
             if entry, tag as edited
  4. curate mode? (tag as dupe, edit entry)
     maybe wait to expose editing non-created entries

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
    current_entry:null,
    id_suffix:0,
    modes:['help','composer'],
    init:function(si) {
        var self = this;
        this.si = si;
        this.mode = 'help';
        jQuery('#composer-add').change(function(evt,ui) {
            var section = $(this).val();
            $(this).val('Add').selectmenu('refresh');
            setTimeout(function() {
                self.selectSection(section);
            },100);
        });
        this.view = new si.opts.viewer().init(null, 'composer-canvas');
        this.repaintCanvas();
        jQuery('#composer-canvas').mousedown({self:this}, this.placeGlyph);
        jQuery('input,select','form.composer-custom')
            .change({self:this}, this.customListener)
            .click({self:this}, this.customListener)//for buttons
        //for mode-help
        jQuery('.composer-select-header','#composer-page').click(function() {
            self.selectSection(String(this.parentNode.id).match(/^\w+/)[0]);
        });
        $('#compose-term').change(function(){self.isSavable()});
        $('#composer-save').click(function(){self.saveGlyph()});
        
        return this;
    },
    switchMode:function(mode) {
        this.mode = mode;
        var page = $('#composer-page');
        for (var i=0,l=this.modes.length;i<l;i++) {
            page.removeClass('mode-'+this.modes[i]);
        }
        page.addClass('mode-'+mode);
    },
    customListener:function(evt) {
        var self = evt.data.self;
        var m = String(this.id).match(/^(\w+)-(\w+)/);
        var shobj = self.current_shape;
        if (shobj && m) {
            var section = m[1], 
                field = this.name,
            //this.value for buttons
                val = ((this.type === 'checkbox' && this.checked === false) 
                       ? '' : $(this).val());
            if (field=='delete') {
                return self.deleteGlyph();
            }
            shobj.key = self.sections[section]
                .transforms[field].call(self,shobj.key,val,shobj.orig_key);
            self.view.clearpure(shobj.shape_ctx);
            self.putShape(shobj.shape_ctx, shobj.key, function(k,s){
                shobj.shape = s;
                self.repaintCanvas();
            });
        }
    },
    deleteGlyph:function() {
        var shobj = this.current_shape;
        if (shobj) {
            delete this.current_shapes[shobj.dom.id];
            $(shobj.dom).remove();
            this.current_shape = null;
            this.repaintCanvas();
            this.switchShown('nothing');
            //TODO:clear form or somethinb
        }
    },
    placeGlyph:function(evt) {
        var self = evt.data.self;
        var pos = $(this).offset();
        if (self.current_shape) {
            self.current_shape.pos = {
                'x':evt.pageX-pos.left,
                'y':evt.pageY-pos.top 
            };
            self.repaintCanvas();
            self.isSavable();
        }
    },
    repaintCanvas:function() {
        this.view.clearpure();//clear() messes up positioning
        this.view.box();
        for (var a in this.current_shapes) {
            var c = this.current_shapes[a];
            if (c.pos && c.shape && c.shape.transforms) {
                this.view.insertShape(c.shape,c.pos.x,c.pos.y);
            }
        }
    },
    selectSection:function(section) {
        var self = this;
        this.switchShown(section+'-select');
        var sec = this.sections[section];
        if (sec && !(section in this.opened_sections)) {
            this.createSymbolList($('#'+section+'-letterlist').get(0),
                                  sec.first,
                                  {size:sec.size,
                                   section:section,
                                   onclick:function(evt) {
                                       if (self.mode=='composer')
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
    shape2Entry:function() {
        var shapes = []; 
        var offset = {x:0, y:0};
        for (var a in this.current_shapes) {
            var sh = this.current_shapes[a],
                x = sh.pos.x, y = sh.pos.y;
            offset.x = Math.max(x,offset.x);
            offset.y = Math.max(y,offset.y);
            shapes.push({'key':sh.key, 'x':x, 'y':y});
        }
        return this.si.signs.clusters2ksw(shapes.map(function(s) {
            s.x -= offset.x; s.y -= offset.y;
            return s;
        },this));
    },
    clearEntry:function() {
        this.view.clearpure();
        this.switchShown('nothing');
        $('#current-shapes').empty();
        this.current_shapes = [];
        this.current_shape = null;
        $('#compose-term').val('');
    },
    loadEntry:function(entry) {
        var self = this;
        this.clearEntry();
        this.si.dict.getEntry(entry,function(x) {
            switch(x.type) {
            case 'entry': 
                var shs = self.si.signs.ksw2cluster(x.item.shapes);
                for (var i=0;i<shs.length;i++) {
                    var s = shs[i];
                    self.editNewShape({key:s.key, 
                                       section:'hand',
                                       onload:function(shobj) {
                                           self.repaintCanvas();
                                       }
                                      });
                    self.current_shape.pos = {x:s.x+100, y:s.y+100};
                }
                //self.repaintCanvas();
                //TODO: $('#text').html(x.item.txt);
                break;
            case 'terms':
                $('#compose-term').val(x.item.join(', '));
            }
        });
    },
    addShape:function(sym,list,opts) {
        var self = this;
        var shobj = {}; for (var a in opts) {shobj[a]=opts[a];}
        shobj.key = sym[1];
        shobj.orig_key = sym[1];
        var li = jQuery("<div class='glyph'>")
            .attr('data-glyph',shobj.key).appendTo(list).get(0);
        li.id = 'composer-glyph-'+(++self.id_suffix);
        if (sym[2] == 'only-help') $(li).addClass('only-help');
        if (sym[0]) $("<span>").appendTo(li).text(sym[0]);
        shobj.ctx = this.si.viewer.createContext(li,opts.size,opts.size,
                                                 shobj.key);
        shobj.shape = {};//pointer
        this.putShape(shobj.ctx,shobj.key,function(k,s){
            for (var b in s) {
                shobj.shape[b] = s[b];
            }
            if (typeof shobj.onload==='function') {
                shobj.onload(shobj)
            }
        });
        if (opts.onclick) $(li).click(shobj,opts.onclick);
        return {'dom':li, 'shape_ctx':shobj.ctx, 'shape':shobj.shape};
    },
    switchShown: function(id) {
        if (this.shown) this.shown.removeClass('show');
        return (this.shown = $('#'+id).addClass('show'));
    },
    editNewShape:function(opts) {
        //assumes opts.key,opts.shape,opts.section
        var self = this;
        var shobj;
        shobj = this.addShape([false,opts.key],
                                $('#current-shapes').get(0),
                                {size:50,
                                 onclick:function(evt){
                                     self.selectShape(this,shobj);
                                 },
                                 onload:opts.onload
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
    isSavable:function() {
        var hasshapes=false;
        for (var a in this.current_shapes) { 
            hasshapes=true; break; 
        }
        if (hasshapes && /\w+/.test($('#compose-term').val())) {
            $('#composer-save').button('enable');
            return true;
        } else {
            $('#composer-save').button('disable');
            return false;
        }
    },
    saveGlyph:function() {
        //do i have an entry_id?
        var db = this.si.db;
        var terms = $('#compose-term').val().split(/\s*,\s*/).map(function(s) {
            return s.replace(/^\s*/,'').replace(/\s*$/,'')
        });
        if (this.current_entry) {
            if (this.current_entry > 0) {
                db.addTag(this.current_entry,'_edited');
            }
            db.updateEntry([this.current_entry,this.shape2Entry(),''],terms);
        } else {
            this.current_entry = -db.lastEntry(true);
            db.addTag(this.current_entry,'_mine');
            db.addEntries([[this.current_entry,terms.join("^"),this.shape2Entry(),'']]);
        }
    },
    general_transforms: {
        'rotate':function(key,rot) {
            if (typeof rot==='string') rot = false;
            var cur_rot = parseInt(key[4],16);
            var cur = parseInt(cur_rot / 8,10);
            //if no rot val, then shift-rotate 45deg
            rot = (rot || cur_rot + 1) % 8;
            return key.substr(0,4)+((cur+rot).toString(16));
        }
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
                'rotate':function(key,rot){return this.general_transforms['rotate'](key,rot);}
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
            'transforms': {
                'shiftsymbol':function(key,rot){return this.general_transforms['rotate'](key,rot);}
            },
            "first":[
                //grep '^\(2ff\|30\)' entry_deps.txt  |head
                ['head','2ff00'],
                ['arms','37600'],
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
            "transforms":{
                'numtimes':function(key,num,orig_key){
                    var c = parseInt(orig_key[2],16);
                    var three = '0';
                    if (num > 1) {
                        c += 1;
                        if (num >2) three = '1';
                    }
                    return key.substr(0,2)+c.toString(16)+three+key.substr(4);
                },
                'between':function(key,betw,orig_key){
                    var c = (betw ? 2 : 0)+parseInt(orig_key[2],16);
                    return key.substr(0,2)+c.toString(16)+key.substr(3);
                }
                //rotate, but why necessary?
            },
            'first':[
                ['contact','20500','twice','20600','thrice','20610'],
                ['hold','20800'],
                ['strike','20b00','twice','20c00','thrice','20c10'],
                ['brush','20e00'],
                //only show this in help--otherwise transformation
                ['touch between','20700','only-help'],
            ]
        },
        'motion':{
            'size':40, 'ranges':['21400','2f7ff'],
            "transforms":{
                'rotate':function(key,rot) {
                    return this.general_transforms['rotate'](key,rot);
                },
                'hand':function(key,hand) {
                    var h = {'left':0,'right':1,'both':2};
                    return (key.substr(0,3)+h[hand]+key.substr(4,1));
                },
                'shiftsymbol':function(key,dir,orig_key) {
                    dir =  ((dir=='back') ? -1 : 1 );
                    var c = parseInt(key[2],16)+dir;
                    return key.substr(0,2)+c.toString(16)[0]+key.substr(3);
                }
            },
            'first': [
                /* conceptual categories:
                   straight: forward/up, left/right, toward/away body, *rotate
                   round, full circle, twist axis
                   straight,round,jagged,toward/away from body,arm,wrist,finger
                 */
                ['up','22a00','22b00','22a14'],
                ['forward','26500'],
                ['diagonal','26100'],
                ['wrist flex','26900'],
                ['repeated','26a00',/*to*/'27200'],
                ['','27300'],
                ['','28000'],
                ['wrist/arm twist','28100'],
                ['','24b00'],
                ['','24200'],
                ['','28800'],
                ['','29000'],
                ['','29a00'],
                ['','2e300'],//looks like 29a00
                ['','2a200'],
                ['g','2b000'],
                ['from/to body','2b700'],
                ['h','2c000'],
                ['i','2d000'],
                ['p','2d500'],
                ['j','2e000'],
                ['o','2e700'],
                ['finger swirl','2f100'],
                ['curl finger','21600'],
                ['uncurl finger','21b00'],
                ['bend fingers together','22104'],
                ['piano fingers','22520']
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