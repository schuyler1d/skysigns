Svg2Canvas = function(){}
Svg2Canvas.prototype = {
    path:function(ctx,path,fill) {
        //stolen from http://appsynergy.net/2010/08/14/converting-svg-path-to-html5-canvas/
        ctx.fillStyle = fill //todo: FILL first (in another function)
        ctx.beginPath();
        path.replace(/([a-zA-Z])\s*([^a-zA-Z]*[^a-zA-Z\s])/g,function(match,b,numbers,pos,wholestr) {
            var num_ary = numbers.split(/\s/).map(function(n){return parseFloat(n);});
            switch(b.toUpperCase()) {
            case 'M': ctx.moveTo.apply(ctx,num_ary); break;
            case 'C': ctx.bezierCurveTo.apply(ctx,num_ary); break;
            case 'L': ctx.lineTo.apply(ctx,num_ary); break;
            }
            return match;
        });
        ctx.stroke();
        ctx.fill(); //am i sure?
    },
    rect:function(ctx,x,y,w,h,fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(x,y,w,h);
    },
    transform:function(str) {
        //translate(), scale(), and rotate()

    }
};