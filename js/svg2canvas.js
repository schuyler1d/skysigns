SvgNormal = function(){}
SvgNormal.prototype = {
    init:function() {
        var self = this;
        var y = document.createElement('script');y.src = 'js/jquery.svg.js';
        document.body.appendChild(y);
        y.onload = function() {
            self.svgwrap = jQuery('#svg').svg();
        }
        return this;
    },
    clear:function() {
        this.svgwrap.empty();
    },
    insertShape:function(shape,x,y,fgcolor,svgwrap) {
        svgwrap = svgwrap || this.svgwrap;
        var svg = svgwrap.svg('get');
        var parent = svgwrap;
        parent = svg.other(parent,'g',{
            transform:'translate('+x+','+y+')'
        });
        for (var t=0;t<shape.transforms.length;t++) {
            parent = svg.other(parent,'g',{
                transform:this._transform(shape.transforms[t])
            });
        }
        for (var i=0;i<shape.paths.length;i++) {
            var p = shape.paths[i];
            var color = p[1].replace('f','#ffffff').replace('0',fgcolor||'#000000');
            switch(p[0]) {
            case 'r':
                var xywh = p[2].split(',');
                svg.rect(parent,xywh[0],xywh[1],xywh[2],xywh[3],
                         {fill:color});
                break;
            case 'p':
                svg.path(parent,p[2],{fill:color});
                break;
            }
        }
    },
    _transform:function(tr) {
        return (tr.replace(/s\(/g,'scale(')
                .replace(/t\(/g,'translate(').replace(/r\(/g,'rotate('));
    }
}

CanvgViewer = function(){}
CanvgViewer.prototype = {
    init:function(cb,id) {
        var self = this;
        var onload = function() {
            if (self.canvas) {
                self.ctx=self.canvas.getContext('2d');
	        if (cb) cb();
            }
        }
        jQuery(function() {
            self.canvas = document.getElementById(id);
            if (!window.canvg) {
                var y = document.createElement('script');y.src = 'js/canvg.js';
                document.body.appendChild(y);
                y.onload = onload;
            } else {
                onload();
            }
        });
        return this;
    },
    clear:function() {
        this.w = this.canvas.width = this.canvas.width;
        this.ctx.translate(this.w/2,this.w/2);
        this.ctx.scale(1.5,1.5);
        this.ctx.save();
    },
    _transform:SvgNormal.prototype._transform,
    createContext:function(domparent,w,h) {
        return (jQuery('<canvas width="'+w+'" height="'+h+'"></canvas>')
                .appendTo(domparent)
                .get(0).getContext('2d'));
    },
    insertShape:function(shape,x,y,fgcolor,ctx) {
        ctx = ctx || this.ctx;
        var svgstr = '';
        svgstr += '<g transform="translate('+x+','+y+')" >';

        for (var t=0;t<shape.transforms.length;t++) {
            svgstr += '<g transform="'+this._transform(shape.transforms[t])+'" >';
        }
        for (var i=0;i<shape.paths.length;i++) {
            var p = shape.paths[i];
            var color = p[1].replace('f','#ffffff').replace('0',fgcolor||'#000000');
            switch(p[0]) {
            case 'r':
                var xywh = p[2].split(',');
                svgstr += ('<rect x="'+xywh[0]+'" y="'+xywh[1]
                           +'" width="'+xywh[2]+'" height="'+xywh[3]
                           +'" fill="'+color+'"/>');
                break;
            case 'p':
                svgstr += ('<path fill="'+color+'" d="'+p[2]+'" />');
                break;
            }
        }
        for (var t=0;t<shape.transforms.length;t++) {
            svgstr += '</g>';
        }
        svgstr += '</g>'; //original translated
        var w = ctx.canvas.width;
        ctx.drawSvg(svgstr,w/2,w/2,w,w);
    }
}

ViewerBoth = function(){}
ViewerBoth.prototype = {
    init:function() {
        this.svg = new SvgNormal().init();
        this.canvas = new CanvgViewer().init();
        return this;
    },
    clear:function() {
        this.svg.clear();
        this.canvas.clear();
    },
    insertShape:function(shape,x,y,fgcolor) {
        this.svg.insertShape(shape,x,y,fgcolor);
        this.canvas.insertShape(shape,x,y,fgcolor);
    }
}

