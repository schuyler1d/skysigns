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

//for android which does not have local xhr access
var base_path = 'http://skyb.us/static/signlanguage/';
base_path = '';

function SkyInterface(){}
SkyInterface.prototype = {
    init:function(signs,dict) {
        var self = this;
        jQuery('#error').append('<li>pre</li>');
        this.dict = dict.open();
        this.signs = signs.open(/*this.dict.db*/);
        this.viewer = new ViewerBoth().init();
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
            self[what].load(self.finishedloading);
            jQuery(this).addClass('clicked');
        });
        
    },
    finishedloading:function(val,results,what) {
        return;
        jQuery('#error').append('<li>finished something</li>');
        console.log(val);
        console.log(what);
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
    open:function(db){ this.loadPaths(); this.db = db; return this; },
    load:function(cb){ this.loadShapes(cb); },
    loaded:function(cb){
        if (this.db) {
	    this.db.haveShapes(cb);
        } else {
            cb(Boolean(localStorage['10000'] && localStorage['38b07']));
        }
    },
    loadPaths:function(cb) {
        //needs to happen every page-load
        var self = this;
        jQuery.ajax({
            url:base_path+'iswa/paths.txt', dataType:'text',
            success:function(text){
                self.paths = [];
                var text_arr = text.split("\n");
                for(var i=0,l=text_arr.length;i<l;i++) {
                    self.paths.push(text_arr[i].split('$').slice(1));
                }
                if (typeof cb==='function') cb(text_arr.length);
            },
            error:function(xhr,status,error) {
		jQuery('#error').append('<li>nopaths:'+error+'</li>');
            }
        });
    },
    loadShapes:function(cb) {
        var self = this;
        jQuery.ajax({
            url:base_path+'iswa/shapes.txt', dataType:'text',
            success:function(text){
                var text_arr = text.split("\n");
                var next_ten, i=0, l=text_arr.length;
                cb(l, [], 'presh');
                next_ten = function() {
                    for (var m=Math.min(i+10,l);i<m;i++) {
                        var line = text_arr[i].match(/^(\w+)\$(.+)$/)
                        if (line) {
                            if (!self.db) {
                                localStorage[line[1]] = line[2];
                            } else {
                                self.db.addShape(line.slice(1),undefined,i);
                            }
                        }
                    }
                    if (i < l) {
                        next_ten();
                        //TODO: nec. for localStorage
                        //setTimeout(next_ten,500); 
                    } else {
                    	cb(l, [], 'shapes');
                    }
                }
                next_ten();
            },
            error:function(xhr,status,error) {
		jQuery('#error').append('<li>noshapes:'+error+'</li>');
            }
        });
    }
}

function SkyDictionary(){}
SkyDictionary.prototype = {
    open:function(){
        this.db = new SkyDB().open();
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
            url:base_path+'iswa/entries.txt', dataType:'text',
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
        cb(l,[],'signs');
        for(var i=0;i<l;i++) {
            if (i % 1000===0) {
                jQuery('#error').append('<li>'+i+'</li>')
                console.log(i);
                console.log(text_arr[i]);
            }
            if (text_arr[i].length) {
                db.add(name,text_arr[i].split('$'),function(){},i)
            }
        }
    }
}

function SkyDB(){}
if (window.openDatabase) {
    ///paths should be in memory (in array)
    ///shapes can use localStorage since it just needs .get()
    ///localStorage can be used for word-shape list and word data

    /*
    db.transaction(function (tx) {
       tx.executeSql('CREATE TABLE IF NOT EXISTS foo (id unique, text)');
       tx.executeSql('INSERT INTO foo (id, text) VALUES (1, "synergies")');
    });
    tx.executeSql('INSERT INTO foo (id, text) VALUES (?, ?)', [id, userValue]);
    tx.executeSql('SELECT * FROM foo', [], function (tx, results) {
       var len = results.rows.length
       results.rows.item(i).text
    })
    */
    SkyDB.prototype = {
        searchTerms:function(q,cb) {
            this.db.transaction(function(tx) {
                tx.executeSql("SELECT * FROM terms WHERE term LIKE '"+q.replace("'","''")+"%'",[],
                              function(tx,res) { cb(res); }
                             );
            });
        },
        getEntry:function(entry,cb) {
            this.db.transaction(function(tx) {
                tx.executeSql("SELECT * FROM entries WHERE entry=?",[entry],
                              function(tx,res) { cb('entry',res.rows.item(0)); });
                tx.executeSql("SELECT * FROM terms WHERE entry=?",[entry],
                              function(tx,res) { cb('terms',res); });
            });            
        },
        _add:function(tx,cols,callback) {
            //cols=[id,terms,code,text]
            var terms = cols[1].split('^');
            for (var t=0;t<terms.length;t++) {
                tx.executeSql('INSERT INTO terms VALUES (?,?)',[cols[0],terms[t]],callback);
            }
            tx.executeSql('INSERT INTO entries VALUES (?,?,?)',[cols[0],cols[2],cols[3]],callback);
        },
        add:function(table,cols,callback,i) {
            var self = this;
            this.db.transaction(function(tx) {
            	self._add(tx,cols,callback);
            });
        },
        addShape:function(cols,callback,i) {
	    var self = this;
	    this.db.transaction(function(tx) {
		tx.executeSql('INSERT INTO shapes VALUES (?,?)',cols,function() {
		    if (!self.xxx || i%1000===0) {
						self.xxx = true
			console.log(cols);
		    }
		});
            });
        },
	getShape:function(key,callback) {
	    var self = this;
	    console.log(key);
	    this.db.transaction(function(tx) {
		tx.executeSql('SELECT * FROM shapes WHERE key=?',[key],function(tx,res) {
		    if (res.rows.length) {
			callback('shape',res.rows.item(0));
		    } else {
			console.log('error');
			console.log(res);
		    }
		},function() {console.log(arguments);});
            });
	},
	haveShapes:function(callback) {
	    var self = this;
	    this.db.transaction(function(tx) {
		tx.executeSql('SELECT COUNT(*) FROM shapes WHERE key=? OR key=?',
			      ['10000','38b07'],function(tx,res) {
				  if (res.rows.item(0)['COUNT(*)'] == 2) {
				      callback(2);
				  } else callback(false);
			      });
	    });
	},
	addmany:function(table,rows,callback,i) {
	    var self = this;
	    this.db.transaction(function(tx) {
		for (var i=0;i<rows.length;i++) {
		    self._add(tx,rows[i],callback);
		}
	    });
	},
        clearall:function(callback) {
            var self = this;
            this.db.transaction(function(tx) {
                tx.executeSql('DELETE FROM terms',[],callback);
                tx.executeSql('DELETE FROM entries',[],callback);
            });
        },
        open:function() {
            //iOS webview actually enforces the quota
            try {
                this.db = openDatabase('skysign9','1.0','signbank',2.75*1024*1024);
            } catch(e) {
                jQuery('#error').append('<li>'+e.message+'</li>');
            }
            return this;
        },
        count:function(cb) {
            //more complicated, because we want it to call cb, no matter what;
            this.db.transaction(function (tx) {
                tx.executeSql("SELECT tbl_name from sqlite_master WHERE type = 'table' and tbl_name='entries'",[],function(tx,results) {
                    if (results.rows.length) {
                        tx.executeSql("SELECT COUNT(*) FROM entries",[],function(tx,res) {
                            cb(res.rows.item(0)['COUNT(*)']);
                        });
                    } else {
                        cb(false);
                    }
                });
            })            
        },
        create:function() {
            //dbs on filesystem are at:
            //~/.config/chromium/Default/databases/
            this.db.transaction(function (tx) {
                //entryid-term entryid-shape+pos
                tx.executeSql('CREATE TABLE IF NOT EXISTS terms ( '
                              +'entry INTEGER,'
                              +'term TEXT'
                              +')'
                             );
                tx.executeSql('CREATE TABLE IF NOT EXISTS entries ( '
                              +'entry INTEGER UNIQUE,'
                              +'shapes TEXT,'
                              +'txt TEXT'
                              //TODO: dictionary id, too?
                              +')'
                             );
                tx.executeSql('CREATE TABLE IF NOT EXISTS shapes ( '
                              +'key TEXT,'
                              +'data TEXT'
                              +')'
                             );
            });
        }
    };
}

window.ss = new SkySigns();
window.sd = new SkyDictionary();
window.si = new SkyInterface();

