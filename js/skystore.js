
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
                tx.executeSql("SELECT * FROM terms WHERE term LIKE '"+q.replace("'","''")+"%' ORDER BY term",[],
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
        _add:function(tx,cols,callback,i) {
            //cols=[id,terms,code,text]
            var terms = cols[1].split('^');
            for (var t=0;t<terms.length;t++) {
                tx.executeSql('INSERT INTO terms VALUES (?,?)',[cols[0],terms[t]],callback);
            }
            tx.executeSql('INSERT INTO entries VALUES (?,?,?)',[cols[0],cols[2],cols[3]],
			  function() { callback(null,i); });
        },
        add:function(table,cols,callback,i) {
            var self = this;
            this.db.transaction(function(tx) {
		self._add(tx,cols,callback,i);
            });
        },
        addShape:function(cols,callback,i) {
	    var self = this;
	    this.db.transaction(function(tx) {
		tx.executeSql('INSERT INTO shapes VALUES (?,?)',cols,
			      function() { callback(null,i,cols); });
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
			      },function(tx,e){callback(false,e);});
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
            //iOS webview actually enforces the quota: seems to max out at 2.75M
            try {
                this.db = openDatabase('skysign11','1.0','signbank',60*1024*1024);
            } catch(e) {
                jQuery('#error').append('<li>db:'+e.message+'</li>');
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
