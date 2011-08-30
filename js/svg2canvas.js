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
    init:function() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.clear();
        return this;
    },
    clear:function() {
        this.ctx.restore();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(150,150);
    },
    str2nums:function(str) {
        return str.split(/\s+/).map(function(n){return parseFloat(n);});
    },
    path:function(ctx,path,fill) {
        //stolen from http://appsynergy.net/2010/08/14/converting-svg-path-to-html5-canvas/
        var self = this;
        ctx.fillStyle = fill //todo: FILL first (in another function)
        ctx.beginPath();
        path.replace(/([a-zA-Z])\s*([^a-zA-Z]*[^a-zA-Z\s])/g,function(match,b,numbers,pos,wholestr) {
            var num_ary = self.str2nums(numbers);
            switch(b.toUpperCase()) {
            case 'M': ctx.moveTo.apply(ctx,num_ary); break;
            case 'C': ctx.bezierCurveTo.apply(ctx,num_ary); break;
            case 'L': ctx.lineTo.apply(ctx,num_ary); break;
            }
        });
        
        ctx.stroke();
        ctx.fill(); //am i sure?
    },
    rect:function(ctx,x,y,w,h,fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(x,y,w,h);
    },
    transform:function(ctx,str) {
        var self = this;
        str.replace(/(\w)\(([^\)]+)\)/,function(match,tfm,nums) {
            var num_ary = self.str2nums(nums);
            switch(tfm) {
            case 't': ctx.translate.apply(ctx,num_ary); break;
            case 's': ctx.scale.apply(ctx,num_ary); break;
            case 'r': ctx.rotate(num_ary[0]); break;
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
          for (var i=0;i<shape.paths.length;i++) {
              var p = shape.paths[i];
              var color = p[1].replace('f','#ffffff').replace('0',fgcolor||'#000000');
              switch(p[0]) {
                case 'r':
                    var xywh = p[2].split(',');
                    this.rect(ctx,xywh[0],xywh[1],xywh[2],xywh[3],color);
                    break;
                case 'p':
                    this.path(ctx,p[2],color);
                    break;
                }
          }
        ctx.restore();
    }
};