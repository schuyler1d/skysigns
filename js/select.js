Composer = function(){}
Composer.prototype = {
    init:function(si) {
        this.si = si;
        var list = jQuery('#letterlist').get(0);
        console.log(this.glyphs);
        for (a in this.glyphs) {
            var glyphs = this.glyphs[a];
            for (var i=0,l=glyphs.length;i<l;i++) {
                this.addShape(glyphs[i],list);
            }
        }
        return this;
    },
    putShape:function(ctx,key) {
        var self = this;
        this.si.signs.getShape(key, function(s) {
            self.si.viewer.insertShape(s,0,0,'#000000',ctx);
        })
    },
    addShape:function(sym,list) {
        var key = sym[1];
        var li = jQuery("<li>").appendTo(list).get(0);
        var abc = jQuery("<span>").appendTo(li).text(sym[0]);
        var ctx = this.si.viewer.createContext(li,30,30,key);
        this.putShape(ctx,key);
        jQuery(li).click(function(evt) {
            console.log(key);
        });
    },
    glyphs: {
        "first":[
            ['a','1f720'],
            ['b','14720'],
            ['c','16d20'],
            ['d','10128'],
            ['e','14a20'],
            ['f','1ce20'],
            ['g','1f000'],
            ['h','11502'],
            ['i','19220'],
            ['k','14020'],
            ['l','1dc20'],
            ['m','18d20'],
            ['n','11920'],
            ['o','17620'],
            ['p','14021'],
            ['q','1f021'],
            ['r','11a20'],
            ['s','20320'],
            ['t','1fb20'],
            ['u','11520'], //redundant to h...
            ['v','10e20'],
            ['w','18720'], //redundant to 6
            ['x','10620'],
            ['y','19a20'],
            ['1','10020'],
            ['2','10e20'],
            ['3','11e20'],
            ['4','14420'], //bug in symbol (svg, too)
            ['5','14c20'],
            ['6','18720'],
            ['7','1a520'],
            ['8','1bb20']
        ],
        "other":[
            ['sick','1c500'],
            ['know','15a00'],
            ['applause','14c00'],
            ['rain','15050'],
            ['hard','11040'],
            ['moon','1ed10'],
            ['airplane','1cb21'],
            ['number','18510'],
            ['new','18220'],
        ],
        'modifiers':[
            ['contact','20500','twice','20600','thrice','20610'],//rotate
            ['hold','20800'],
            ['strike','20b00','twice','20c00','thrice','20c10'],//rotate
            ['brush','20e00'],
            ['simultaneous','2fb00'] //rotate
        ],
        'context or facial expressions': [
            ['head','2ff00'],
            ['trunk','36d00']
        ],
        'hand motion': [
            ['curl','21600'],
            ['uncurl finger','21b00'],
            ['bend (back and forth)','22104'], //multiple,rotate
            ['piano fingers','']
        ]
    }
}