
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
    //addcallback(), 
    //countcallback(), 
    //getcallback()
    SkyDB.prototype = {
        searchTerms:function(q,cb) {
            this.db.transaction(function(tx) {
                tx.executeSql("SELECT * FROM terms WHERE term LIKE (?||'%') ORDER BY term",[q],
                              function(tx,res) { cb({'results':res,'type':"terms"}); }
                             );
            });
        },
        getEntry:function(entry,cb) {
            this.db.transaction(function(tx) {
                tx.executeSql("SELECT * FROM entries WHERE entry=?",[entry],
                              function(tx,res) { cb({'type':"entry",'item':res.rows.item(0)}); });
                tx.executeSql("SELECT * FROM terms WHERE entry=?",[entry],
                              function(tx,res) { cb({'type':"terms",'results':res}); });
            });            
        },
        _add:function(tx,cols,callback,i) {
            //cols=[id,terms,code,text]
            var terms = cols[1].split('^');
            for (var t=0;t<terms.length;t++) {
                tx.executeSql('INSERT INTO terms VALUES (?,?)',[cols[0],terms[t]]);
            }
            tx.executeSql('INSERT INTO entries VALUES (?,?,?)',[cols[0],cols[2],cols[3]],
			  function() { 
			      callback({'index':i,'type':"dict",'item':cols}); 
			  },this.errback(callback));
        },
        addEntries:function(rows,callback,i) {
            var self = this;
	    this.db.transaction(function(tx) {
		    for (var j=0;j<rows.length;j++) {
			var cols = rows[j];
                        if (cols.length > 1)
			    self._add(tx,cols,callback,i+j);
		    }
		});
        },
	errback:function(cb) {
	    return function(tx, err) {
		cb({log:'db error',error:err});
	    }
	},
        addShapes:function(shapes,callback,i) {
	    var self = this;
	    var getcb = function(i,j,cols,typ) {
		return function() { 
		    callback({'index':i+j,'item':cols,'type':typ}); 
		}
	    }
	    this.db.transaction(function(tx) {
		for (var j=0;j<shapes.length;j++) {
		    var cols = shapes[j];
		    tx.executeSql('INSERT INTO shapes VALUES (?,?)',
				  cols,getcb(i,j,cols,'signs'),self.errback(callback));
		}
            });
	},
        addPaths:function(paths,callback,i) {
	    var self = this;
	    var getcb = function(i,j,cols,typ) {
		return function() { 
		    callback({'index':i+j,'item':cols,'type':typ}); 
		}
	    }
	    this.db.transaction(function(tx) {
		for (var j=0;j<paths.length;j++) {
		    var cols = paths[j];
		    tx.executeSql('INSERT INTO paths VALUES (?,?)',
				  [parseInt(cols[0]),cols.slice(1).join('$')],
                                  getcb(i,j,cols,'paths'),self.errback(callback));
		}
            });
	},
	getPath:function(key,callback) {
	    var self = this;
	    this.db.transaction(function(tx) {
		tx.executeSql('SELECT * FROM paths WHERE id=?',[key],function(tx,res) {
		    if (res.rows.length) {
			callback({'key':key,'type':'path','item':res.rows.item(0)});
		    } else {
			callback({'key':key,'type':'path','error':'path '+key+' not found'});
                    }
                });
            });
        },
	getShape:function(key,callback) {
	    var self = this;
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
	    callback({'log':'haveShapes:'+this.db});
	    callback({'log':'haveShapes f:'+(typeof this.haveShapes)});
	    this.db.transaction(function(tx) {
		tx.executeSql('SELECT COUNT(*) FROM shapes WHERE key=? OR key=?',
			      ['10000','38b07'],function(tx,res) {
				  if (res.rows.item(0)['COUNT(*)'] == 2) {
				      callback({'loaded':2,'type':"signs"});
				  } else callback({'loaded':false,'type':"signs"});
			      },function(tx,e){callback({'loaded':false,'error':e,'type':"signs"});});
	    });
	},
	addmany:function(text,add_func,cb,typ,process_func) {
            var self = this;
            var text_arr = text.split("\n");
            var i=0, l=text_arr.length;
            cb({'total':l-1, 'type':typ});
            var next_ten = function() {
		var lines = [];
                for (var m=Math.min(i+100,l);i<m;i++) {
                    process_func(text_arr[i],lines);
		}
                self[add_func](lines,cb,i);
                if (i < l) {
                    next_ten();
                }
            }
            next_ten();
	},
        clearEntries:function(callback) {
            var self = this;
            this.db.transaction(function(tx) {
                tx.executeSql('DELETE FROM tags');
                tx.executeSql('DELETE FROM terms');
                tx.executeSql('DELETE FROM entries',[],callback);
            });
        },
        clearShapes:function(callback) {
            var self = this;
            this.db.transaction(function(tx) {
                tx.executeSql('DELETE FROM paths');
                tx.executeSql('DELETE FROM shapes',[],callback);
            });
        },
        addTag:function(entry,tag,callback) {
            callback = callback || function(){};
            var self = this;
            this.tagQuery({entry:entry,tag:tag}, function(res) {
                if (!res.total) {
                    self.db.transaction(function(tx) {
                        tx.executeSql('INSERT INTO tags VALUES (?,?)',
                                      [entry,tag],
                                      callback,self.errback(callback));
                    });
                }
            });
        },
        tagQuery:function(fields,cb) {
            var q = {where:'',fields:[]};
            if (fields.tag) {
                q.where = 'tag=?';
                q.fields.push(fields.tag);
            }
            if (fields.entry) {
                if (fields.tag) q.where += ' AND ';
                q.where += 'entry=?';
                q.fields.push(fields.entry);
            }
            this.db.transaction(function(tx) {
                tx.executeSql("SELECT * FROM tags WHERE "+q.where, q.fields,
                              function(tx,res) { 
                                  var len = res.rows.length;
                                  cb({'type':"tag",
                                      'total':len,
                                      'item':len && res.rows.item(0)
                                     }); });
            });
        },
        open:function(logback) {
            //iOS webview actually enforces the quota: seems to max out at 2.75M
	    logback = logback || function(){};
	    logback({'log':'db orig?:'+window.openDatabase_orig});
            try {
                this.db = openDatabase('skysign11','1.0','signbank',60*1024*1024);
		logback({'log':'db opening:'+this.db});
            } catch(e) {
		logback({'log':'db error:'+e.message,'error':e});
            }
            return this;
        },
        count:function(cb) {
            //more complicated, because we want it to call cb, no matter what;
                jQuery('#error').append('<li>count: '+this.db+'</li>');
            this.db.transaction(function (tx) {
                tx.executeSql("SELECT tbl_name from sqlite_master WHERE type = 'table' and tbl_name='entries'",[],function(tx,results) {
                    if (results.rows.length) {
                        tx.executeSql("SELECT COUNT(*) FROM entries",[],function(tx,res) {
				var count = res.rows.item(0)['COUNT(*)'];
				cb({'loaded':count,'total':count,'type':"dict"});
                        });
                    } else {
                        cb({'loaded':false,'type':"dict"});
                    }
                });
            })            
        },
        create:function() {
            //dbs on filesystem are at: ~/.config/chromium/Default/databases/
            this.db.transaction(function (tx) {
                tx.executeSql('CREATE TABLE IF NOT EXISTS terms ( '
                              +'entry INTEGER,'
                              +'term TEXT'
                              +')'
                             );
                tx.executeSql('CREATE INDEX IF NOT EXISTS termindex '
                              +'ON terms (term)'
                             );
                tx.executeSql('CREATE TABLE IF NOT EXISTS entries ( '
                              +'entry INTEGER UNIQUE,'
                              +'shapes TEXT,'
                              +'txt TEXT'
                              //TODO: dictionary id, too?
                              +')'
                             );
		//these may or may not be used;
                tx.executeSql('CREATE TABLE IF NOT EXISTS shapes ( '
                              +'key TEXT UNIQUE,'
                              +'data TEXT'
                              +')'
                             );
                tx.executeSql('CREATE TABLE IF NOT EXISTS paths ( '
                              +'id INTEGER UNIQUE,'
                              +'data TEXT'
                              +')'
                             );
                ///TAGGING
                tx.executeSql('CREATE TABLE IF NOT EXISTS tags ( '
                              +'entry INTEGER,'
                              +'tag TEXT'
                              +')'
                             );

            });
        }
    };
}
