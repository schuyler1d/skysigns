/*
TODO: 
 * load paths, shapes, dict into django
 * determine when 
 * server interface

  x. connect initial paths file with shapes file and confirm that they're
      the same version (or path should include a version)
 */

function SkyInterface(){}
SkyInterface.prototype = {
    composer_mode:'help',
    init:function(signs,dict,opts) {
        var self = this;
        ///func.bind() NOT supported in 1.5 android!
	var progress = function(x){return self.progress(x);};
	var debug = this.debug();
        debug.begin();
        this.opts = opts;
        this.db = new SkyDB().open(progress);
        jQuery.getScript('js/server.js',function() {        
            self.dict = dict.open(self.db,opts);
            self.signs = signs.open(self.db,opts);
        });
        this.viewer = new opts.viewer().init(debug.onviewer,'canvas');

	this.loadInterface(); //interface to load data
        this.initListeners();

        if (localStorage['config_edit_allowed']) {
            jQuery(document.body).addClass('edit_allowed');
        }

	if (document.location.search) {
	    setTimeout(function() {
		    self.search(document.location.search.substr(1),true);
		},1000)
	}

	debug.end();
        return this;
    },
    initListeners:function() {
        var self = this;
        jQuery(document.forms.wordsearch).submit(function(evt) {
            evt.preventDefault();
            self.search(this.elements['q'].value,true);
            this.elements['q'].select();
        });
        jQuery('#q').live('input',function(evt) {
            if (this.value.length > 1)
                self.search(this.value);
        }).live('change', function(evt) {
          //when the field is cleared
          if (this.value.length === 0) {
            $('#results').empty();
          }
        });

        $('#composer-page').live('pagebeforeshow',function(event,ui){
            self.initComposer(function() {
                if (self.edit_current_entry) {
                    self.composer.loadEntry(self.edit_current_entry);
                    self.edit_current_entry = null;
                } 
            });
        });
        $('#signdisplay-edit-link').click(function() {
            self.composer_mode = 'composer';
            self.edit_current_entry = self.current_entry;
        });
        jQuery('#ajaxtest button').click(this.ajax);
	try { // this will fail if openDatabase returns NULL
	    this.checkloaded();
	} catch(e) {
	    jQuery('#error').append('<li>e:'+e.message+'</li>');
	}
        
    },
    initComposer:function(cb) {
        var self = this;
        if (this.composer) {
            this.composer.switchMode(this.composer_mode);
            if (cb) cb();
        } else {
            jQuery.getScript('js/select.js',function() {
                self.composer = new Composer().init(self);
                self.composer.switchMode(self.composer_mode);
                if (cb) cb();
            });
        }
    },
    debug:function() {
	var self = this;
	return {
            'begin':function() { jQuery('#error').append('<li>initializing...</li>'); },
	    'end':function() { jQuery('#error').append('<li>initialization complete</li>'); },
	    'onviewer':function() {}
	}
    },
    loadInterface:function() {
	var loads = {signs:1,dict:1};
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
            var t,rows = x.item;
            for (var i=0,l=rows.length;i<l;i++) {
                t = rows[i]
                $(dom).append('<li><a href="#" onclick="si.showTerm('+t.entry+');">'+t.term+'</a></li>');
            }
            if (rows.length===1 || autoshow && rows.length) {
                self.showTerm(rows[0].entry);
            }
            if (rows.length===0) {
              var extra = '';
              if (self.server_connection) {
                extra = '<p class="" style="margin-top:1em;"><a href="#" onclick="si.requestTerm('
                  +escape(q)+');">Request dictionary addition</a></p>';
              }
              $(dom).append('<li>No results found.'+extra+'</li>');       
            }
            $(dom).listview('refresh');
        });
    },
    showTerm:function(entry) {
        var self = this;
        this.viewer.clear();//remove any previous sign
        this.current_entry = entry;
        this.dict.getEntry(entry,function(x) {
	    switch(x.type) {
            case 'entry': 
                self.signs.showSign(self.viewer,x.item.shapes);
                $('#text').html(x.item.txt);
                break;
            case 'terms':
                $('#terms').html(x.item.join(', '))
                break;
            }
        });
        $.mobile.changePage('#signdisplay');
    },
    requestTerm:function(escaped_q) {
      //1. add to request database/call the server (or queue to sync)
      //2. alert(ok)
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
        var process_shape = function(table, s) {
            var shape = s.data;
            if (shape) {
            	var sparts = shape.split('$');
            	rv.transforms = sparts[1].split(';')
                self.marshallPaths(
                    sparts[0].split(','),
                    function(paths) {rv.paths = paths; cb(rv);});
            } else {
                cb(rv);
            }
        }
        if (key in this.shapes) {
            process_shape(null, {'data':this.shapes[key]})
        } else {
            this.db.getShape(key,process_shape);
        }
    },
    marshallPaths:function(path_ids,cb) {
        var len = path_ids.length,
            todo=len;
        var rv = [];
        for (var i=0;i<len;i++) {
            this.getAsyncPath(
                path_ids[i], i,
                function(x,path) {
                    rv[x] = path;
                    if (--todo===0) cb(rv)
                });
        }
    },
    getPath:function(i) { return this.paths[i]; },
    getAsyncPath:function(path_id,i,cb) { 
        var self = this;
        if (this.paths[path_id]) {
            cb(i,this.paths[path_id]); 
        } else {
            this.db.getPath(path_id,function(p) {
                if (p.item) {
                    var path = self.paths[path_id] = p.item.data.split('$');
                    cb(i,path);
                } else {
                    //TODO: error! -- load path data!
                }
            });
        }
    },
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
    clusters2ksw:function(clusters) {
        return clusters.map(function(c) {
            return (c.key
                    +((c.x<0)?'n':'')+Math.abs(c.x)+'x'
                    +((c.y<0)?'n':'')+Math.abs(c.y));
        }).join('S');
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
        this.db=db; this.opts=opts; 
        this.paths = new Array(30602);
        this.shapes = {};
        return this; 
    },
    load:function(cb){ this.db.create(); this.loadShapes(cb); this.loadPathsDB(cb); },
    loaded:function(cb){ this.db.haveShapes(cb); this.db.havePaths(cb); },
    loadPaths:function(cb) {
        var self = this;
	cb = cb || function(){};
        jQuery.ajax({
	    url:this.opts.base_path+'iswa/pathsmin.txt', dataType:'text',
            success:function(text){
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
    loadPathsDB:function(cb) {
        var self = this;
        jQuery.ajax({
	    url:(this.opts.remote_path||this.opts.base_path)+'iswa/paths.txt', dataType:'text',
            success:function(text){
                self.db.addmany(text,'addPaths',cb,'paths',
                                function (x,lines) { lines.push(x.split('$')); });
            }
        });
    },
    loadShapes:function(cb) {
        var self = this;
        jQuery.ajax({
	    url:(this.opts.remote_path||this.opts.base_path)+'iswa/shapes.txt',
            dataType:'text',
            success:function(text){
                self.db.clearShapes(function() {
                    self.db.addmany(text,'addShapes',cb,'signs',
                                function (x,lines) {
                                    var line = x.match(/^(\w+)\$(.+)$/);
                                    if (line) lines.push(line.slice(1));
                                });
                });
            },
            error:function(xhr,stat,e) {cb({'log':'noshapes:'+stat,'error':e});}
        });
    }
}

function SkyDictionary(){}
SkyDictionary.prototype = {
    open:function(db,opts){ 
        this.db=db; 
        this.opts=opts; 
        return this; 
    },
    searchTerms:function(q,cb) { this.db.searchTerms(q,cb); },
    getEntry:function(entry,cb) { 
        this.db.getEntry(entry,cb); 
    },
    loaded:function(cb) { this.db.count(cb); },
    load:function(cb) {
        var self = this;
        this.db.create();
        jQuery.ajax({
	    url:(this.opts.remote_path||this.opts.base_path)+'iswa/entries.txt',
            dataType:'text',
            success:function(text){
                self.db.clearEntries(function() {
                    self.db.addmany(text,'addEntries',cb,'dict',
                       function (x,lines) { lines.push(x.split('$')); });
                });
            },
            error:function(xhr,st,e) { cb({'log':'noentries:'+e}); }
        });
	cb({'event':"request",'type':"dict",'log':"dict.load()"});
    }
}

window.ss = new SkySigns();
window.sd = new SkyDictionary();
window.si = new SkyInterface();

if (document.location.protocol==='file:') {
  //settings for mobile
  window.initSkyS = function() {
    //jQuery('#error').append('<li>db_orig:'+window.openDatabase_orig+'</li>');
    jQuery('#error').append('<li>location: '+document.location+'</li>');
    window.si.init(window.ss,window.sd,{
        base_path:'',
        server:1, //0=none, 1=accessible, 2=primary
        remote_path:'http://skyb.us/static/signlanguage/v1/',
        storage:{ paths:'sql', shapes:'sql' },
        viewer:CanvgViewer, //for android 2.3-
        loadpaths:false
    });
  }
  if (window.PhoneGap) { //is not currently working.  why not?
      PhoneGap.onDeviceReady.subscribeOnce(window.initSkyS);
  } else {
      jQuery(document).bind('mobileinit',initSkyS);
  }
} else {
    jQuery.getScript('config.js')
}

jQuery(window).bind('load',function() {
    $('#q').focus();
});
jQuery('.type-interior').bind('pageshow',function() {
    $('#q').select();
});
