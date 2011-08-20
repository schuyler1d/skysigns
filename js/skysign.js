/*
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
    init:function(signs) {
        var self = this;
        this.signs = signs;
        this.svgwrap = jQuery('#svg').svg();
        jQuery(document.forms.wordsearch).submit(function(evt) {
            evt.preventDefault();
            self.search(this.elements['q'].value);
        });
        return this;
    },
    search:function(q) {
        this.signs.searchTerms(q,function(obj) {
            
        });
    }
}

function SkyDictionary(){}
SkyDictionary.prototype = {
    open:function(){
        this.db = new SkyDB().open();
    },
    searchTerms:function(q,cb) {
        
    },
    searchShapes:function(shapes,cb) {

    },
    loaded:function(cb) {
        this.db.create();

    },
    load:function(cb) {
        var self = this;
        jQuery.ajax({
            url:'iswa/entries.txt', dataType:'text',
            success:function(text){
                self.addTable('entries',text,self.db,cb);
            }
        });
    },
    addTable:function(name,text,db,cb){
        var text_arr = text.split("\n");
        for(var i=0,l=text_arr.length;i<l;i++) {
            if (i % 1000===0) console.log(i);
            if (text_arr[i].length) {
                db.add(name,text_arr[i].split('$'),cb)
            }
        }
    }
}

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
    ksw2cluster:function(ksw) {
        var ksw_sym = '([123][a-f0-9]{2}[012345][a-f0-9])',
        ksw_ncoord = '(n?)([0-9]+)x(n?)([0-9]+)',
        r = new RegExp(ksw_sym+ksw_ncoord);
        m = ksw.match(r);
        return [m[1],
                parseInt(m[3],10) * ((m[2]=='n')?-1:1),
                parseInt(m[5],10) * ((m[4]=='n')?-1:1)
               ];
        
    },
    open:function(cb){ this.loadPaths(cb); },
    load:function(cb){ this.loadShapes(cb); },
    loaded:function(){
        return Boolean(localStorage['10000'] && localStorage['38b07']);
    },
    loadPaths:function(cb) {
        //needs to happen every page-load
        var self = this;
        jQuery.ajax({
            url:'iswa/paths.txt', dataType:'text',
            success:function(text){
                self.paths = [];
                var text_arr = text.split("\n");
                for(var i=0,l=text_arr.length;i<l;i++) {
                    self.paths.push(text_arr[i].split('$').slice(1));
                }
                if (typeof cb==='function') cb(text_arr.length);
            }
        });
    },
    loadShapes:function(cb) {
        var self = this;
        jQuery.ajax({
            url:'iswa/shapes.txt', dataType:'text',
            success:function(text){
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
            "entries":{
                add:function(cols,tx,cb){
                    //cols=[id,terms,code,text]
                    var terms = cols[1].split('^');
                    for (var t=0;t<terms.length;t++) {
                        tx.executeSql('INSERT INTO terms VALUES (?,?)',[cols[0],terms[t]],cb);
                    }
                    tx.executeSql('INSERT INTO entries VALUES (?,?,?)',[cols[0],cols[2],cols[3]],cb);
                },
                removeall:function(callback,tx){
                    tx.executeSql('DELETE FROM terms',[],callback);
                    tx.executeSql('DELETE FROM entries',[],callback);
                }
            }
        },
        add:function(table,cols,callback) {
            var self = this;
            this.db.transaction(function(tx) {
                self.tables[table].add.call(self,cols,tx,callback);
            });
        },
        clearall:function(callback) {
            var self = this;
            this.db.transaction(function(tx) {
                self.tables['entries'].removeall(callback,tx);
            });
        },
        open:function() {
            this.db = openDatabase('skysign7','1.0','signbank',60*1024*1024);
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
                        cb(0);
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
            });
        }
    };
}

window.ss = new SkySigns();
window.sd = new SkyDictionary();
window.si = new SkyInterface();

ss.open();
sd.open();