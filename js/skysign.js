/*
 */

function SkyInterface(){}
SkyInterface.prototype = {
    init:function(signs,dict,opts) {
        var self = this;
        ///func.bind() NOT supported in 1.5 android!
	var progress = function(x){return self.progress(x);};
        jQuery('#error').append('<li>pre</li>');
        this.opts = opts;
        this.db = new SkyDB().open(progress);
        this.dict = dict.open(this.db,opts);
        this.signs = signs.open(this.db,opts);
        if (opts.loadpaths) {
            setTimeout(function() {
                self.signs.loadPaths(progress); 
            },0); //breaks composer if non-zer0 visited first
        }
	this.loadinterface();
	var debug = this.debug();
        this.viewer = new opts.viewer().init(debug.onviewer,'canvas');

        jQuery(document.forms.wordsearch).submit(function(evt) {
            evt.preventDefault();
            self.search(this.elements['q'].value,true);
            this.elements['q'].select();
        });
        jQuery('#q').live('input',function(evt) {
            if (this.value.length > 1)
                self.search(this.value);
        });

        $('#composer-page').live('pagecreate',function(event,ui){
            /* This could be run every time, but we set data-dom-cache="true" in html,
               so we don't re-render all the glyphs if someone loads this page.
             */
            jQuery.getScript('js/select.js',function() {
                self.composer = new Composer().init(self);
            });
        });

	debug.middle();
        jQuery('#ajaxtest button').click(this.ajax);
	try { // this will fail if openDatabase returns NULL
	    this.checkloaded();
	} catch(e) {
	    jQuery('#error').append('<li>e:'+e.message+'</li>');
	}

	if (document.location.search) {
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
	var progress = function(x){return self.progress(x);};
	var decorate = function(what) {
	    var display = jQuery('#'+what+'test').get(0);
	    jQuery('button',display).click(function(evt){
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
	var callback = function(x){return self.progress(x);};
        this.signs.loaded(callback);
        this.dict.loaded(callback);
    },
    showloaded:function(x) {
	this[x.type+'_loaded'] = x.loaded;
	var display = jQuery('#'+x.type+'test').get(0);
	jQuery('.progress',display).show();
	jQuery('.bar',display).css('width','100%');
	jQuery('.msg',display).text('loaded:'+(x.count || x.loaded));
    },
    notloaded:function(x) {
        var self = this;
	var display = jQuery('#'+x.type+'test').get(0);
	jQuery('.msg',display).text('not loaded');
	var what = x.type;
        
    },
    _prog_max:{},
    progress:function(x) {
	if (x.total) {//max
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
    },
    ajax:function() {
        jQuery('#ajaxtest').append('<span>start...</span>');
        jQuery.ajax({
            url:'http://skyb.us/', dataType:'text',
            success:function(text){
                jQuery('#ajaxtest').append('<span>skyb.us success</span>');
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
        this.db.getShape(key,function(table,s) {
            var shape = s.data;
            if (shape) {
            	var sparts = shape.split('$');
            	rv.paths = sparts[0].split(',').map(self.getPath,self);
            	rv.transforms = sparts[1].split(';')
            }
            cb(rv);
        });
    },
    getPath:function(i) { return this.paths[i]; },
    showSign:function(viewer,shapetext) {
        if (!shapetext) {
            throw Error("no shapetext");
        }
        var shapes = this.ksw2cluster(shapetext);
        for (var i=0;i<shapes.length;i++) {
            var s = shapes[i];
            this.insertShape(viewer,s.key,s.x,s.y);
        }        
    },
    insertShape:function(viewer,key,x,y) {
    	var self = this;
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
    open:function(db,opts){ this.db=db; this.opts=opts; return this; },
    load:function(cb){ this.db.create(); this.loadShapes(cb); },
    loaded:function(cb){ this.db.haveShapes(cb); },
    loadPaths:function(cb) {
        //needs to happen every page-load
        var self = this;
	cb = cb || function(){};
        jQuery.ajax({
	    url:this.opts.base_path+'iswa/pathsmin.txt', dataType:'text',
            success:function(text){
                self.paths = new Array(30602);
                var text_arr = text.split("\n");
                cb({'total':text_arr.length,'type':"paths"});
                for(var i=0,l=text_arr.length;i<l;i++) {
                    var cols = text_arr[i].split('$');
                    self.paths[parseInt(cols[0],10)] = cols.slice(1);
                }
                cb({'loaded':self.paths.length,'type':"paths"});
            },
            error:function(xhr,status,error) {
		cb({'error':error,'type':"paths",'log':"nopaths"});
            }
        });
	cb({'event':"request",'type':"paths"});
    },
    loadShapes:function(cb) {
        var self = this;
        jQuery.ajax({
	    url:(this.opts.remote_path||this.opts.base_path)+'iswa/shapes.txt',
            dataType:'text',
            success:function(text){
                self.db.clearShapes();
                self.db.addmany(text,'addShapes',cb,'signs',
                                function (x,lines) {
                                    var line = x.match(/^(\w+)\$(.+)$/);
                                    if (line) lines.push(line.slice(1));
                                });
            },
            error:function(xhr,stat,e) {cb({'log':'noshapes:'+stat,'error':e});}
        });
    }
}

function SkyDictionary(){}
SkyDictionary.prototype = {
    open:function(db,opts){ this.db=db; this.opts=opts; return this; },
    searchTerms:function(q,cb) { this.db.searchTerms(q,cb); },
    getEntry:function(entry,cb) { this.db.getEntry(entry,cb); },
    loaded:function(cb) { this.db.count(cb); },
    load:function(cb) {
        var self = this;
        this.db.create();
        jQuery.ajax({
	    url:(this.opts.remote_path||this.opts.base_path)+'iswa/entries.txt',
            dataType:'text',
            success:function(text){
                self.db.clearEntries();
                self.db.addmany(text,'addEntries',cb,'dict',
                     function (x,lines) { lines.push(x.split('$')); });
            },
            error:function(xhr,st,e) { cb({'log':'noentries:'+e}); }
        });
	cb({'event':"request",'type':"dict"});
    }
}

window.ss = new SkySigns();
window.sd = new SkyDictionary();
window.si = new SkyInterface();

window.initSkyS = function() {
    jQuery('#error').append('<li>deviceready orig?:'+window.openDatabase_orig+'</li>');
    jQuery('#error').append('<li>location: '+document.location+'</li>');
    window.si.init(window.ss,window.sd,{
        base_path:'',
        remote_path:((document.location.protocol==='file:')
                     ? 'http://skyb.us/static/signlanguage/'
                     : ''),
        storage:{
            paths:'sql',
            shapes:'sql'
        },
        viewer:CanvgViewer,
        loadpaths:true
    });
}
if (window.PhoneGap) {
    //is not currently working.  why not?
    PhoneGap.onDeviceReady.subscribeOnce(window.initSkyS);
} else {
    jQuery(document).bind('mobileinit',initSkyS);
}
jQuery(window).bind('load',function() {
    $('#q').focus();
});
jQuery('.type-interior').bind('pageshow',function() {
    $('#q').select();
});
