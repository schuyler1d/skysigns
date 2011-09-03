/*
http://keith-wood.name/svg.html

window.ss = {x:0}
s.loadShapes(function(x,y){++window.ss.x;if (window.ss.x % 1000===0) console.log('hi'+window.ss.x+','+y)})
s.loadPaths();
svg = jQuery('#svg').svg().svg('get')
s.insertShape(svg,jQuery('#svg').svg(),'10000',0,0);

things to do: parse/access db, load text files, interface
dictionary, shapes/paths, interface
*/

function SkyInterface(){}
SkyInterface.prototype = {
    init:function(signs,dict,opts) {
        var self = this;
        jQuery('#error').append('<li>pre</li>');
        this.dict = dict.open(opts);
        this.signs = signs.open(this.dict.db,opts);
	this.signs.onpaths = function() {
	    jQuery('#error').append('<li>paths</li>');
	    self.signs.insertShape(self.viewer,'10000',0,0);
	}
        this.viewer = new opts.viewer().init(function() {
	    jQuery('#error')
	    .append('<li>canvas</li>')
	    .children(':last')
	    .click(function() {
	       self.viewer.ctx.drawSvg('<circle r="20" cx="20" cy="20" fill="red" />',0,0,100,100);
	    });
	    jQuery('#error')
	    .append('<li>viewer</li>')
	    .children(':last')
	    .click(self.signs.onpaths);
	});
        jQuery('#error').append('<li>load paths</li>')
	.children(':last')
	.click(function(){self.signs.loadPaths();});

        jQuery(document.forms.wordsearch).submit(function(evt) {
            evt.preventDefault();
            self.search(this.elements['q'].value,true);
            this.elements['q'].select();
        });
        jQuery('#q').bind('input',function(evt) {
            if (this.value.length > 1)
                self.search(this.value);
        });
        jQuery('#ajaxtest .button').click(this.ajax);
        this.checkloaded();
        if (document.location.search) {
            console.log(document.location.search.substr(1));
            setTimeout(function() {
                self.search(document.location.search.substr(1),true);
            },1000)
        }
	jQuery('#error').append('<li>end</li>');
        return this;
    },
    search:function(q,autoshow) {
        var self = this;
        this.dict.searchTerms(q,function(results) {
            var dom = $('#results').empty().get(0);
            var t,r = results.rows;
            for (var i=0,l=r.length;i<l;i++) {
                t = r.item(i);
                $(dom).append('<li><a href="#" onclick="si.showTerm('+t.entry+');">'+t.term+'</a></li>');
            }
            if (r.length===1 || autoshow && r.length) {
                self.showTerm(r.item(0).entry);
            }
        });
    },
    showTerm:function(entry) {
        var self = this;
        self.viewer.clear();//remove any previous sign
        this.dict.getEntry(entry,function(what,res) {
            switch(what) {
            case 'entry': 
                self.signs.showSign(self.viewer,res.shapes);
                $('#text').html(res.txt);
                break;
            case 'terms':
                var terms = [];
                for (var i=0;i<res.rows.length;i++) {
                    terms.push(res.rows.item(i).term);
                }
                $('#terms').html(terms.join(','))
                break;
            }
        });
    },
    checkloaded:function() {
        var self = this;
        this.signs.loaded(function(yes) {
            if (yes) { self.signs_loaded=yes; }
            else self.notloaded('signs',yes);
        });
        this.dict.loaded(function(yes) {
            if (yes) { self.dict_loaded=yes; }
            else self.notloaded('dict',yes);
        });
    },
    notloaded:function(what,val) {
        var self = this;
        var error = ($('#error')
                     .append('<li class="load">Load '+what+'</li>')
                     .get(0).lastChild);
        $(error).click(function(evt){
		self[what].load(function() {self.progress.apply(self,arguments);});
		jQuery(this).addClass('clicked');
	    });
        
    },
    progress:function(val,results,what) {
	if (typeof val==='number') {
	    console.log('max number:'+val);
	    this._prog_max = val;
	    jQuery('#bar').css('width',3).empty();
	    jQuery('#progress').show();
	} else if (results != 0 && results%1000===0) {
	    jQuery('#bar').css('width',parseInt(100*results/this._prog_max,10));
	    console.log('bar:'+results);
	} else if (results === this._prog_max-2) {
	    //-2: who knows why, but from l=7412, we seem to get to 7410
	    jQuery('#bar').css('width','100px').append('complete');
	} 
    },
    ajax:function() {
        jQuery('#ajaxtest').append('<span>start</span>');
        jQuery.ajax({
            url:'http://skyb.us/', dataType:'text',
            success:function(text){
                jQuery('#ajaxtest').append('<span>skybus</span>');
            },
            error:function(text) {
                jQuery('#ajaxtest').append('<span>error</span>');
            }
        });
    }
}

function SkySigns(){}
SkySigns.prototype = {
    getShape:function(key, cb) {
        var self = this;
        var rv = {'key':key};
        var shape = localStorage[key];
        if (shape) {
            var sparts = shape.split('$');
            rv.paths = sparts[0].split(',').map(this.getPath,this);
            rv.transforms = sparts[1].split(';')
            return cb(rv);
        } else if (this.db) {
            this.db.getShape(key,function(table,s) {
        	//var shape = localStorage.getItem(key);
        	shape = s.data;
        	if (shape) {
            	    var sparts = shape.split('$');
            	    rv.paths = sparts[0].split(',').map(self.getPath,self);
            	    rv.transforms = sparts[1].split(';')
        	}
        	cb(rv);
            });
        }
    },
    getPath:function(i) {
        return this.paths[i];
    },
    showSign:function(viewer,shapetext) {
        var shapes = this.ksw2cluster(shapetext);
        for (var i=0;i<shapes.length;i++) {
            var s = shapes[i];
            this.insertShape(viewer,s.key,s.x,s.y);
        }        
    },
    insertShape:function(viewer,key,x,y) {
    	var self = this;
        //console.log(key+' x:'+x+',y:'+y);
        this.getShape(key, function(s) {
            viewer.insertShape(s,x,y);
        });
    },
    ksw2cluster:function(ksw) {
        var rv = [];
        var ksw_sym = '([123][a-f0-9]{2}[012345][a-f0-9])',
            ksw_ncoord = '(n?)([0-9]+)x(n?)([0-9]+)',
            rxp = new RegExp(ksw_sym+ksw_ncoord),
            signs = ksw.split('S');
        for (var i=0;i<signs.length;i++) {
            var m = signs[i].match(rxp);
            rv.push({'key':m[1],
                     'x':parseInt(m[3],10) * ((m[2]=='n')?-1:1),
                     'y':parseInt(m[5],10) * ((m[4]=='n')?-1:1)
                    });
        }
        return rv;
    },
    open:function(db,opts){ 
        //this.loadPaths(); 
        this.db = db; 
        this.opts = opts;
        return this; 
    },
    load:function(cb){ this.db.create(); this.loadShapes(cb); },
    loaded:function(cb){
        if (this.db) {
	    this.db.haveShapes(cb);
        } else {
            cb(Boolean(localStorage['10000'] && localStorage['38b07']));
        }
    },
    connectPaths:function() {
        if (window.SignPaths) this.paths = window.SignPaths;
	if (this.onpaths) this.onpaths();
    },
    loadPaths:function(cb) {
        //needs to happen every page-load
        var self = this;
        jQuery.ajax({
            url:this.opts.base_path+'iswa/paths.txt', dataType:'text',
            success:function(text){
                self.paths = [];
                var text_arr = text.split("\n");
                for(var i=0,l=text_arr.length;i<l;i++) {
                    self.paths.push(text_arr[i].split('$').slice(1));
                }
                if (typeof cb==='function') cb(text_arr.length);
		jQuery('#error').append('<li>gotpaths.txt</li>');
            },
            error:function(xhr,status,error) {
		jQuery('#error').append('<li>nopaths:'+error+'</li>');
            }
        });
    },
    loadShapes:function(cb) {
        var self = this;
        jQuery.ajax({
            url:this.opts.base_path+'iswa/shapes.txt', dataType:'text',
            success:function(text){
                var text_arr = text.split("\n");
                var next_ten, i=0, l=text_arr.length;
                cb(l-1, [], 'shapes');
                next_ten = function() {
                    for (var m=Math.min(i+10,l);i<m;i++) {
                        var line = text_arr[i].match(/^(\w+)\$(.+)$/)
                        if (line) {
                            if (!self.db) {
                                localStorage[line[1]] = line[2];
                            } else {
                                self.db.addShape(line.slice(1),cb,i);
                            }
                        }
                    }
                    if (i < l) {
                        next_ten();
                    }
                }
                next_ten();
            },
            error:function(xhr,status,error) {
		jQuery('#error').append('<li>noshapesx:'+status+error+'</li>');
            }
        });
    }
}

function SkyDictionary(){}
SkyDictionary.prototype = {
    open:function(opts){
        this.db = new SkyDB().open();
        this.opts = opts;
        return this;
    },
    searchTerms:function(q,cb) { this.db.searchTerms(q,cb); },
    getEntry:function(entry,cb) { this.db.getEntry(entry,cb); },
    searchShapes:function(shapes,cb) {

    },
    loaded:function(cb) {
        this.db.count(cb);
    },
    load:function(cb) {
        var self = this;
        this.db.create();
        jQuery.ajax({
            url:this.opts.base_path+'iswa/entries.txt', dataType:'text',
            success:function(text){
                self.addTable('entries',text,self.db,cb);
            },
            error:function(xhr,status,error) {
		jQuery('#error').append('<li>noentries:'+error+'</li>');
            }
        });
    },
    addTable:function(name,text,db,cb){
        var text_arr = text.split("\n"), 
            l=text_arr.length;
        cb(l-1,[],'signs');
        for(var i=0;i<l;i++) {
            if (text_arr[i].length) {
                db.add(name,text_arr[i].split('$'),cb,i)
            }
        }
    }
}

window.ss = new SkySigns();
window.sd = new SkyDictionary();
window.si = new SkyInterface();

