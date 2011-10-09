/*
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
        var sec = this.sections.hand;
        this.createSymbolList(jQuery('#hand-letterlist').get(0),
                              sec.first,
                              {size:sec.size});
        return this;
    },
    selectSection:function(section) {
        if (this.shown) this.shown.hide();
        this.shown = $('#'+section+'-select').show();
        var sec = this.sections[section];
        console.log(this.shown);
        if (!(section in this.opened_sections)) {
            this.opened_sections[sections] = {};
            this.createSymbolList($('#'+section+'-letterlist').get(0),
                                  sec.first,
                                  {size:sec.size});
        }
    },
    createSymbolList:function(target,glyphs,opts) {
        var self = this;
        var addAsync = function(g) {
            setTimeout(function() {
                self.addShape(g,target,opts.size);
            },100);
        }
        for (var i=0,l=glyphs.length;i<l;i++) {
            addAsync(glyphs[i]);
        }
    },
    putShape:function(ctx,key) {
        var self = this;
        this.si.signs.getShape(key, function(s) {
            self.si.viewer.insertShape(s,0,0,'#000000',ctx);
        })
    },
    addShape:function(sym,list,size) {
        var key = sym[1];
        var li = jQuery("<div class='hand-shape-choice'>").appendTo(list).get(0);
        var abc = jQuery("<span>").appendTo(li).text(sym[0]);
        var ctx = this.si.viewer.createContext(li,size,size,key);
        this.putShape(ctx,key);
        jQuery(li).click(function(evt) {
            console.log(key);
        });
    },
    sections: {
        "hand":{
            "size":34, "ranges":['10000','20400'],
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
                ['applause','14c00'],
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
                ['simultaneous','2fb00'] //rotate
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
        'sequence':{}
    }
}