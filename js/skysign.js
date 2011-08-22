/*
http://keith-wood.name/svg.html

TODO:
  1. example: 'attractive' sign is too tall, 'alseep soundly' too tall cutoff on bottom

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
    init:function(signs,dict) {
        var self = this;
        this.signs = signs.open();
        this.dict = dict.open();
        this.svgwrap = jQuery('#svg').svg();
        jQuery(document.forms.wordsearch).submit(function(evt) {
            evt.preventDefault();
            self.search(this.elements['q'].value);
        });
        this.checkloaded();
        return this;
    },
    search:function(q) {
        var self = this;
        this.dict.searchTerms(q,function(results) {
            var dom = $('#results').empty().get(0);
            var t,r = results.rows;
            for (var i=0,l=r.length;i<l;i++) {
                t = r.item(i);
                $(dom).append('<li><a href="#signdisplay" onclick="si.showTerm('+t.entry+');">'+t.term+'</a></li>');
            }
            if (r.length===1) {
                self.showTerm(t.entry);
            }
        });
    },
    showTerm:function(entry) {
        var self = this;
        self.svgwrap.empty();//remove any previous sign
        this.dict.getEntry(entry,function(what,res) {
            switch(what) {
            case 'entry': 
                self.signs.showSign(self.svgwrap,res.shapes);
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
                     .append('<li>'+what+' not loaded, click to load</li>')
                     .get(0).lastChild);
        $(error).click(function(evt){
            self[what].load(self.finishedloading);
        });
        
    },
    finishedloading:function(val,results,what) {
        console.log(val);
        console.log(what);
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
    showSign:function(svg,shapetext) {
        var shapes = this.ksw2cluster(shapetext);
        var svgcontext = svg.svg('get');
        for (var i=0;i<shapes.length;i++) {
            var s = shapes[i];
            this.insertShape(svgcontext,svg,s.key,s.x,s.y);
        }        
    },
    insertShape:function(svg,parent,key,x,y) {
        var s = this.getShape(key);
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
    open:function(cb){ this.loadPaths(cb); return this; },
    load:function(cb){ this.loadShapes(cb); },
    loaded:function(cb){
        cb(Boolean(localStorage['10000'] && localStorage['38b07']));
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
        add:function(table,cols,callback) {
            var self = this;
            this.db.transaction(function(tx) {
                //cols=[id,terms,code,text]
                var terms = cols[1].split('^');
                for (var t=0;t<terms.length;t++) {
                    tx.executeSql('INSERT INTO terms VALUES (?,?)',[cols[0],terms[t]],cb);
                }
                tx.executeSql('INSERT INTO entries VALUES (?,?,?)',[cols[0],cols[2],cols[3]],cb);
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

