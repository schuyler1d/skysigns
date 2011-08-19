/*
window.ss = {x:0}
s.loadShapes(function(x,y){++window.ss.x;if (window.ss.x % 1000===0) console.log('hi'+window.ss.x+','+y)})
s.loadPaths();
svg = jQuery('#svg').svg().svg('get')
s.insertShape(svg,jQuery('#svg').svg(),'10000',0,0);
*/

function SkySigns(){}

SkySigns.prototype = {
    getShape:function(key) {
        var rv = {'key':key};
        var shape = localStorage[key];
        if (shape) {
            var sparts = shape.split('$');
            rv.paths = sparts[0].split(',').map(this.getPath,this);
            rv.transforms = sparts[1].split(';')
        }
        return rv;
    },
    getPath:function(i) {
        return this.paths[i];
    },
    transform:function(tr) {
        return (tr.replace('s(','scale(')
                .replace('t(','translate(').replace('r(','rotate('));
    },
    insertShape:function(svg,parent,key,x,y) {
        var s = this.getShape(key);
        console.log(s);
        parent = svg.other(parent,'g',{
            transform:'translate('+x+','+y+')'
        });
        for (var t=0;t<s.transforms.length;t++) {
            parent = svg.other(parent,'g',{
                transform:this.transform(s.transforms[t])
            });
        }
        for (var i=0;i<s.paths.length;i++) {
            var p = s.paths[i];
            var color = p[1].replace('f','#ffffff').replace('0','#000000');
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
    openDB:function(){
        this.db = new SkyDB().open();
    },
    loadDB:function(cb){
        var self = this;
        //self.loadPaths(cb);
        self.loadShapes(cb);
    },
    loadPaths:function(cb) {
        var self = this;
        jQuery.ajax({
            url:'iswa/paths.txt', dataType:'text',
            success:function(text){
                self.paths = [];
                var text_arr = text.split("\n");
                for(var i=0,l=text_arr.length;i<l;i++) {
                    self.paths.push(text_arr[i].split('$').slice(1));
                }
            }
        });
    },
    loadShapes:function(cb) {
        var self = this;
        jQuery.ajax({
            url:'iswa/shapes.txt', dataType:'text',
            success:function(text){
                //self.addTable('shapes',text,self.db,cb);
                var text_arr = text.split("\n");
                var next_ten, i=0, l=text_arr.length;
                next_ten = function() {
                    for (var m=Math.min(i+10,l);i<m;i++) {
                        var line = text_arr[i].match(/^(\w+)\$(.+)$/)
                        localStorage[line[1]] = line[2];
                    }
                    setTimeout(next_ten,2000);
                }
                next_ten();
            }
        });
    },
    loadEntries:function(cb) {
        var self = this;
        jQuery.ajax({
            url:'iswa/entries.txt', dataType:'text',
            success:function(text){
                self.addTable('entries',text,self.db,cb);
            }
        });
    },
    addTable:function(name,text,db,cb){
        //doesn't seem to work :-(
        //db.addmany(name,text.split('$'),cb);
        //return;
        var text_arr = text.split("\n");
        for(var i=0,l=text_arr.length;i<l;i++) {
            if (i % 1000===0) console.log(i);
            if (text_arr[i].length) {
                db.add(name,text_arr[i].split('$'),cb)
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
        tables:{
            "paths":{
                add:function(cols,tx,cb){
                    var color = {'0':0,'f':1,'x':-1};
                    tx.executeSql('INSERT INTO paths VALUES (?,?,?,?)',
                                  [parseInt(cols[0],10),cols[1]==='r',color[cols[2]],cols[3] ],
                                 cb);
                },
                all:function(callback,tx){
                    tx.executeSql('SELECT * FROM paths',[],callback);
                },
                removeall:function(callback,tx){
                    tx.executeSql('DELETE FROM paths',[],callback);
                }
            },
            "shapes":{
                add:function(cols,tx,cb){
                    tx.executeSql('INSERT INTO shapes VALUES (?,?,?)',cols,cb);
                },
                removeall:function(callback,tx){
                    tx.executeSql('DELETE FROM shapes',[],callback);
                }
            },
            "entries":{
                add:function(cols,tx,cb){
                    //[id,terms,code,text]
                    var terms = cols[1].split('^');
                    for (var t=0;t<terms.length;t++) {
                        tx.executeSql('INSERT INTO terms VALUES (?,?)',[cols[0],terms[t]],cb);
                    }
                    var shapes = cols[2].split('^');
                    for (var s=0;s<shapes.length;s++) {
                        var esh = this.ksw2cluster(shape[s]);
                        esh.unshift(cols[0]);
                        tx.executeSql('INSERT INTO entryshapes VALUES (?,?,?,?)',esh,cb);
                    }
                },
                removeall:function(callback,tx){
                    tx.executeSql('DELETE FROM terms',[],callback);
                    tx.executeSql('DELETE FROM entryshapes',[],callback);
                }
            }
        },
        tx:function(table,action,cb){
            var self = this;
            this.db.transaction(function(tx) {
                self.tables[table][action].call(self,cb,tx,cb);
            });
        },
        add:function(table,cols,callback) {
            var self = this;
            this.db.transaction(function(tx) {
                self.tables[table].add.call(self,cols,tx,callback);
            });
        },
        addmany:function(table,rows,callback) {
            var self = this;
            this.db.transaction(function(tx) {
                for(var i=0,l=rows.length;i<l;i++) {
                    self.tables[table].add(rows[i].split('$'),tx,callback);
                }
            });
        },
        count:function(callback) {
            this.db.readTransaction(function(tx) {
                tx.executeSql('SELECT COUNT(*) FROM shapes',[],function(tx,r) {
                    callback('shapes',r.rows.item(0)['COUNT(*)']);
                });
                tx.executeSql('SELECT COUNT(*) FROM paths',[],function(tx,r) {
                    callback('paths',r.rows.item(0)['COUNT(*)']);
                });
            });
        },
        clearall:function(callback) {
            var self = this;
            this.db.transaction(function(tx) {
                self.tables['shapes'].removeall(callback,tx);
                self.tables['paths'].removeall(callback,tx);
                self.tables['entries'].removeall(callback,tx);
            });
        },
        open:function() {
            this.db = openDatabase('skysign6','1.0','signbank',60*1024*1024);
            if (localStorage['signdb_created']) {
                this.create();
            }
            return this;
        },
        ksw2cluster:function(ksw) {
            var ksw_sym = 'S([123][a-f0-9]{2}[012345][a-f0-9])';
            var ksw_ncoord = '(n?[0-9]+xn?[0-9]+)';
            
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
                tx.executeSql('CREATE TABLE IF NOT EXISTS entryshapes ( '
                              +'entry INTEGER,'
                              +'shape TEXT,'
                              +'x INTEGER,'
                              +'y INTEGER,'
                              +'col INTEGER'
                              +')'
                             );
                /*
                tx.executeSql('CREATE TABLE IF NOT EXISTS shapes ( '
                              +'key TEXT UNIQUE,'
                              +'paths TEXT,'
                              +'transforms TEXT'
                              +')'
                             );
                tx.executeSql('CREATE TABLE IF NOT EXISTS paths ( '
                              +'id INTEGER UNIQUE,'
                              +'isrect BOOLEAN,'
                              +'color INTEGER,'
                              +'path TEXT'
                              +')'
                             );
                */
                localStorage['signdb_created'] = 'yes';
            });
        }
    };
}

window.s = new SkySigns();
s.openDB();