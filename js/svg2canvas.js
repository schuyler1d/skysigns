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
    insertShape:function(shape,x,y,fgcolor) {
        var svg = this.svgwrap.svg('get');
        var parent = this.svgwrap;
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
        return (tr.replace('s(','scale(')
                .replace('t(','translate(').replace('r(','rotate('));
    }
}

ViewerBoth = function(){}
ViewerBoth.prototype = {
    init:function() {
        this.svg = new SvgNormal().init();
        this.canvas = new Svg2Canvas().init();
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

Svg2Canvas = function(){}
Svg2Canvas.prototype = {
    /* signs still at issue: 150, ?barrier,
    */
    init:function() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.clear();
        return this;
    },
    clear:function() {
        this.canvas.width = this.canvas.width;
        this.ctx.translate(150,150);
        this.ctx.save();
    },
    str2nums:function(str) {
        return str.split(/[\s,]+/).map(function(n){return parseFloat(n);});
    },
    path:function(ctx,path,fill) {
        var self = this;
        this.current = {x:0,y:0};
        ctx.fillStyle = fill;
        ctx.strokeStyle = fill; //todo: FILL first (in another function)
        ctx.lineWidth = 0;
        ctx.beginPath();
        path = path.replace(/-?[\d.]+e-\d+/g,'0');
        path.replace(/([a-zA-Z])\s*([^a-zA-Z]*)/g,function(match,b,numbers,pos,wholestr) {
            var num_ary = self.str2nums(numbers.replace(/\s+$/,''));
            var rel = (b == b.toLowerCase());
            switch(b.toUpperCase()) {
            case 'M': 
                self._series(ctx,'moveTo',num_ary.slice(0,2),2,rel);
                if (num_ary.length > 2) {
                    self._series(ctx,'lineTo',num_ary.slice(2),2,rel);
                }
                break;
            case 'L': self._series(ctx,'lineTo',num_ary,2,rel);break;
            case 'C': self._series(ctx,'bezierCurveTo',num_ary,6,rel);break;
            case 'Z': ctx.closePath();break;
            case 'A': //steal from:
                //http://code.google.com/p/canvg/source/browse/trunk/canvg.js#1308
                self.arc2canvas(ctx,'arcTo',num_ary,2,rel);break;
            }
        });
        ctx.stroke();
        if (fill) ctx.fill();
        
    },
    arc2canvas:function(ctx,cmd,ary,arglen,rel) {
        console.log('ARC NOT IMPLEMENTED YET');
        //see sign for ?150
        //all cases are circle-arcs and 0 1 1 or 0 0 1  
        //no rotation (meaningless)
    },
    _series:function(ctx,cmd,ary,arglen,rel) {
        var l = ary.length/arglen;
        for (var i=0;i<l;i++) { 
            var coords = ary.slice(i*arglen,i*arglen+arglen);
            if (rel) {
                for (var a=0;a<coords.length;a+=2) {
                    coords[a] += this.current.x;
                    coords[a+1] += this.current.y;
                }
            }
            ctx[cmd].apply(ctx,coords);
            this.current.x = coords[coords.length-2];
            this.current.y = coords[coords.length-1];
        }
    },
    rect:function(ctx,x,y,w,h,fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(x,y,w,h);
    },
    transform:function(ctx,str) {
        var self = this;
        str.replace(/(\w)\(([^\)]+)\)/g,function(match,tfm,nums) {
            var num_ary = self.str2nums(nums);
            switch(tfm) {
            case 't': ctx.translate.apply(ctx,num_ary); break;
            case 's': ctx.scale.apply(ctx,num_ary); break;
            case 'r': ctx.rotate(num_ary[0]* (Math.PI / 180.0)); break;
            }
        });
        

    },
    insertShape:function(shape,x,y,fgcolor) {
        return this._insertShape(this.ctx,shape,x,y,fgcolor);
    },
    _insertShape:function(ctx,shape,x,y,fgcolor) {
        ctx.save();
          ctx.translate(x,y);
          for (var t=0;t<shape.transforms.length;t++) {
              this.transform(ctx,shape.transforms[t]);
          }
          for (var i=0,l=shape.paths.length;i<l;i++) {
              var p = shape.paths[i];
              var color = p[1].replace('f','#ffffff').replace('0',fgcolor||'#000000');
              switch(p[0]) {
                case 'r':
                    var xywh = p[2].split(',');
                    this.rect(ctx,xywh[0],xywh[1],xywh[2],xywh[3],color);
                    break;
                case 'p':
                  //color = color.replace('1111ff','11ff11');
                    this.path(ctx,p[2],color);
                    break;
                }
          }
        ctx.restore();
    }
};