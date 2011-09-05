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
	var progress = self.progress.bind(self);
        jQuery('#error').append('<li>pre</li>');
        this.dict = dict.open(opts,progress);
        this.signs = signs.open(this.dict.db,opts);
        if (opts.loadpaths) {
            this.signs.loadPaths(progress); 
        }
	this.loadinterface();
	var debug = this.debug();
        this.viewer = new opts.viewer().init(debug.onviewer);

        jQuery(document.forms.wordsearch).submit(function(evt) {
            evt.preventDefault();
            self.search(this.elements['q'].value,true);
            this.elements['q'].select();
        });
        jQuery('#q').live('input',function(evt) {
            if (this.value.length > 1)
                self.search(this.value);
        });
	debug.middle();
        jQuery('#ajaxtest button').click(this.ajax);
	try { // this will fail if openDatabase returns NULL
	    this.checkloaded();
	} catch(e) {
	    jQuery('#error').append('<li>e:'+e.message+'</li>');
	}

	if (document.location.search) {
	    console.log(document.location.search.substr(1));
	    setTimeout(function() {
		    self.search(document.location.search.substr(1),true);
		},1000)
	}
	this.paths = {
	    load:function(cb) { self.signs.loadPaths(cb); }
	}

	debug.end();
        return this;
    },
    debug:function() {
	var self = this;
	return {
	    'end':function() { jQuery('#error').append('<li>end</li>'); },
	    'middle':function() { jQuery('#error').append('<li>middle</li>'); },
	    'onviewer':function() {
		//debug
		jQuery('#canvastest div').text('viewer loaded')
		jQuery('#canvastest button')
		    .click(function() {
			    self.viewer.ctx.drawSvg('<circle r="20" cx="20" cy="20" fill="red" />',0,0,100,100);
			});
		
	    }
	}
    },
    loadinterface:function() {
	var loads = {paths:1,signs:1,dict:1};
	var self = this;
	var progress = this.progress.bind(this)
	var decorate = function(what) {
	    var display = jQuery('#'+what+'test').get(0);
	    jQuery('button',display).click(function(evt){
		    console.log(what);
		    self[what].load(progress);
		    jQuery(this).addClass('clicked');
		});
	}
	for (a in loads) decorate(a);
    },
    search:function(q,autoshow) {
        var self = this;
        this.dict.searchTerms(q,function(x) {
            var dom = $('#results').empty().get(0);
            var t,r = x.results.rows;
            for (var i=0,l=r.length;i<l;i++) {
                t = r.item(i);
                $(dom).append('<li><a href="#" onclick="si.showTerm('+t.entry+');">'+t.term+'</a></li>');
            }
            if (r.length===1 || autoshow && r.length) {
                self.showTerm(r.item(0).entry);
            }
            $(dom).listview('refresh');
        });
    },
    showTerm:function(entry) {
        var self = this;
        self.viewer.clear();//remove any previous sign
        this.dict.getEntry(entry,function(x) {
		switch(x.type) {
            case 'entry': 
                self.signs.showSign(self.viewer,x.item.shapes);
                $('#text').html(x.item.txt);
                break;
            case 'terms':
                var terms = [];
                for (var i=0;i<x.results.rows.length;i++) {
                    terms.push(x.results.rows.item(i).term);
                }
                $('#terms').html(terms.join(', '))
                break;
            }
        });
        $.mobile.changePage('#signdisplay');
    },
    checkloaded:function() {
        var self = this;
	var callback = self.progress.bind(self);
        this.signs.loaded(callback);
        this.dict.loaded(callback);
    },
    showloaded:function(x) {
	this[x.type+'_loaded'] = x.loaded;
	var display = jQuery('#'+x.type+'test').get(0);
	console.log(x.type);
	console.log(display);
	jQuery('.progress',display).show();
	jQuery('.bar',display).css('width','100%');
	jQuery('.msg',display).text('loaded:'+(x.count || x.loaded));
    },
    notloaded:function(x) {
        var self = this;
	console.log(x.type);
	var display = jQuery('#'+x.type+'test').get(0);
	console.log(display);
	jQuery('.msg',display).text('not loaded');
	var what = x.type;
        
    },
    _prog_max:{},
    progress:function(x) {
	if (x.total) {//max
	    console.log('max number:'+x.type+':'+x.total);
	    this._prog_max[x.type] = x.total;
	    var display = jQuery('#'+x.type+'test').get(0);
	    jQuery('.bar',display).css('width',3).empty();
	    jQuery('.progress',display).show();
	    jQuery('.msg',display).text('request loading ...'+x.total);
	}
	var max = this._prog_max[x.type];
	if (x.index && x.index%500===0) {//count
	    var display = jQuery('#'+x.type+'test').get(0);
	    jQuery('.bar',display).css('width',parseInt(100*x.index/max,10));
	    console.log('bar:'+x.type+':'+x.index);
	    jQuery('.msg',display).text('request loading: '+x.index+'/'+max);
	}
	if (max && x.index==max-1) {
	    x.loaded = x.index+1;
	    this.showloaded(x);
	}
	if (typeof x.loaded !== 'undefined') {
	    if (x.loaded) this.showloaded(x);
	    else this.notloaded(x);
	}
	if (x.log) {
	    jQuery('#error').append('<li>'+x.log+'</li>');
	}
	if (x.error) {
	    jQuery('#error').append('<li>ERROR: '+(x.error.message || x.error)+'</li>');
	}
	
	/* TODO: else if (results === this._prog_max-2) {
	    //-2: who knows why, but from l=7412, we seem to get to 7410
	    jQuery('#bar').css('width','100px').append('complete');
	    } */
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
    open:function(db,opts,logback){ 
        this.db = db; 
        this.opts = opts;
        return this; 
    },
    load:function(cb){ this.db.create(); this.loadShapes(cb); },
    loaded:function(cb){
	jQuery('#error').append('<li>loaded.db:'+this.db+'</li>');

        if (this.db) {
	    jQuery('#error').append('<li>loaded.db:'+(typeof this.db.haveShapes)+'</li>');
	    this.db.haveShapes(cb);
        } else {
            cb({'loaded':(Boolean(localStorage['10000'] && localStorage['38b07'])),'type':"signs"});
        }
    },
    loadPaths:function(cb) {
        //needs to happen every page-load
        var self = this;
	cb = cb || function(){};
        jQuery.ajax({
            url:this.opts.base_path+'iswa/paths.txt', dataType:'text',
            success:function(text){
                self.paths = [];
                var text_arr = text.split("\n");
                cb({'total':text_arr.length,'type':"paths"});
                for(var i=0,l=text_arr.length;i<l;i++) {
                    self.paths.push(text_arr[i].split('$').slice(1));
                }
                cb({'loaded':self.paths.length,'type':"paths"});
            },
            error:function(xhr,status,error) {
		jQuery('#error').append('<li>nopaths:'+error+'</li>');
		cb({'error':error,'type':"paths"});
            }
        });
	cb({'event':"request",'type':"paths"});
    },
    loadShapes:function(cb) {
        var self = this;
        jQuery.ajax({
            url:this.opts.base_path+'iswa/shapes.txt', dataType:'text',
            success:function(text){
                var text_arr = text.split("\n");
                var next_ten, i=0, l=text_arr.length;
                cb({'total':l-1, 'type':"signs"});
                next_ten = function() {
		    var lines = [];
                    for (var m=Math.min(i+100,l);i<m;i++) {
                        var line = text_arr[i].match(/^(\w+)\$(.+)$/)
			if (line) lines.push(line.slice(1))
		    }
		    if (!self.db) {
			while (ln = lines.shift()) {
			    localStorage[ln[0]] = ln[1];
			}
		    } else {
			self.db.addShapes(lines,cb,i);
		    }
                    if (i < l) {
                        next_ten();
                    }
                }
                next_ten();
            },
            error:function(xhr,status,error) {
		cb({'log':'noshapex:'+status,'error':error});
            }
        });
    }
}

function SkyDictionary(){}
SkyDictionary.prototype = {
    open:function(opts,logback){
        this.db = new SkyDB().open(logback);
        this.opts = opts;
        return this;
    },
    searchTerms:function(q,cb) { this.db.searchTerms(q,cb); },
    getEntry:function(entry,cb) { this.db.getEntry(entry,cb); },
    searchShapes:function(shapes,cb) {

    },
    loaded:function(cb) {
	cb({'log':'loadedx.db:'+(typeof this.db.count)});
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
	cb({'event':"request",'type':"dict"});
    },
    addTable:function(name,text,db,cb){
        var text_arr = text.split("\n"), 
            l=text_arr.length;
        cb({'total':l-1,'type':"dict"});
        for(var i=0;i<l;i++) {
            if (text_arr[i].length) {
                db.addEntries(name,[text_arr[i].split('$')],cb,i)
            }
        }
    }
}

window.ss = new SkySigns();
window.sd = new SkyDictionary();
window.si = new SkyInterface();

