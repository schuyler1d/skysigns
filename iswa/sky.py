#!/usr/bin/python
"""
http://www.signbank.org/signpuddle1.6/glyphogram.php?text=AS14c50S14c58S20600S20600S36d00S36d00M41x34S36d00n21xn14S36d00n21x11S20600n22x23S206000x23S14c5017x1S14c58n42x2&pad=10
--download: gets sgn4.spml and svg1.zip, parses them and spits out files
--spml=<sgn4.spml> spits out succinct entries.txt and entry_deps.txt
--svg=<svg1_dir> spits out paths.txt and shapes.txt
"""
import re,sys,os
from xml.dom.minidom import parse

FILES = {
    'paths':'paths.txt',
    'pathmin':'pathsmin.txt',
    'pathrest':'pathsrest.txt',
    'shapes':'shapes.txt',
    'entries':'entries.txt',
    'entry_dependencies':'entry_deps.txt',
}

#global incrementer
x = {'n':-1}
def inc():
    x['n'] = x['n']+1
    return x['n']

def clean_path(d):
    d = d.replace("\n"," ") #no lines
    #exponentially small nums (e.g. 3.2e-15) == 0
    d = re.sub(r'-?[\d.]+e-\d+',r'0',d)    
    #too many decimals
    d = re.sub(r'(.\d{3})\d+',r'\1',d)
    return d

def pathdata_struct(path_ary):
    return [
        str(path_ary[2]),#number
        path_ary[0][0],#element first letter
        ('%sxx' % path_ary[3].get('fill',''))[1], #0 or f for fill
        path_ary[4] #goodattr
        ]

def shapedata_struct(shapes,fkey):
    return (fkey,
            ','.join(shapes[fkey]["paths"]),
            ';'.join( shapes[fkey]["transforms"] )
            )

def find_paths(dir,allpaths={},shapefile=None):
    cnt = 0
    attributes = {}
    elements = {}
    g2 = []
    shapes = {}
    for fname in sorted(os.listdir(dir)):
        f = open(os.path.join(dir,fname),'r')
        fkey = fname.split('.')[0]
        txt = f.read()
        paths = re.findall(r'(\<(\w+)([^<]+)\/\>)',txt)
        cnt += len(paths)
        shapes[fkey] = {"paths":[]}
        for p in paths:
            elements[p[1]] = 1
            if not p[0] in allpaths:
                attrs = dict(re.findall(r'(\w+)\=\"([^"]*)\"',p[2]))
                goodattr=''
                if p[1]=='rect':
                    goodattr = ','.join((attrs['x'],attrs['y'],
                                         attrs['width'],attrs['height'],
                                        ))
                elif p[1]=='path':
                    goodattr = clean_path(attrs.get('d','ERROR'))
                allpaths[p[0]] = [p[1],p[2],inc(),attrs,goodattr]
            shapes[fkey]["paths"].append(str(allpaths[p[0]][2]))
        shapes[fkey]["transforms"] = [
            re.sub(r'(.\d{3})\d+',r'\1',re.sub(r'(\w)\w+\(',r'\1(',t))
            for t in re.findall(r'<g[^<]+transform="([^"]+)"',txt)]
        if shapefile:
            shapefile.write('$'.join(shapedata_struct(shapes,fkey))+"\n")
        f.close()
    return {"paths":allpaths,
            "shapes":shapes,
            "attrs":attributes,
            "elts":elements,
            "cnt":cnt,
            "pathlen":len(allpaths),
            }

def find_all_paths(dir):
    allpaths={}
    allshapes={}
    cnt = 0
    shapefile=open(FILES['shapes'],'w')
    for dname in sorted(os.listdir(dir)):
        path = os.path.join(dir,dname)
        if os.path.isdir(path):
            d = find_paths(path,allpaths,shapefile)
            allshapes.update(d['shapes'])
            cnt += d['cnt']
    pathfile=open(FILES['paths'],'w')
    def path_val(a,b):
        return allpaths[a][2]-allpaths[b][2]

    ordered_paths = sorted(allpaths, path_val)
    for p in ordered_paths:
        pathdata = pathdata_struct(allpaths[p])
        pathfile.write('$'.join(pathdata)+"\n")
    return {"count":cnt,"shapes":allshapes,
            "paths":allpaths,"ordered_paths":ordered_paths}

def bsw2key(bsw):
    #http://www.signpuddle.net/mediawiki/index.php/Binary_SignWriting
    return 'S%s%s%s' % (
        bsw[0], #base
        hex(int(bsw[1],16)-922)[2:], #fill
        hex(int(bsw[2],16)-928)[2:], #rot
        )

        
def csw2ksw(csw):
    "convert from unicode format in spml file to text -- adapted from csw.php"
    #AS1c100S1ce00S26600M15x43S1c100n9x15S1ce00n7xn43S26600n15xn10
    #n='negative'  LMR = left, middle, right
    #see csw.php#offset2cluster()
    #A S1c100 S1ce00 S26600 M15x43 S1c100 n9x15 S1ce00 n7xn43 S26600 n15xn10
    #  \_preamble of shps_/ \_base_coord        \shp   \coord \shp   \coord
    #                              \_bottom     \_top         \_arrow
    #'pick' search for M15x43
    def replace(match):
        ksw = ''
        usym = match.group(0)
        return bsw2key([
                hex(ord(uchar)-int('1d700',16))[2:] #chop off '0x'
                for uchar in usym])
        
    return re.sub(ur'[\U0001D800-\U0001DA8B][\U0001DA9A-\U0001DA9F][\U0001DAA0-\U0001DAAF]',
                  replace,
                  csw, 0, re.UNICODE)

def ksw2cluster(ksw):
    if not ksw:
        return []
    ksw_sym = r'S([123][a-f0-9]{2}[012345][a-f0-9])'
    ksw_ncoord = r'(n?[0-9]+xn?[0-9]+)'
    ksw_basepos = r'[LMR][0-9]+x[0-9]+'
    pieces = re.findall(ksw_sym+ksw_ncoord,ksw)
    return pieces
    

def parse_spml(spmlfile):
    spml = parse(spmlfile)
    rv = []
    for e in spml.documentElement.getElementsByTagName('entry'):
        entry = {"terms":[],
                 "id":e.getAttribute('id'),
                 "modified":e.getAttribute('mdt'),
                 "created":e.getAttribute('cdt'),
                 "source":[s.firstChild.wholeText 
                           for s in e.getElementsByTagName('src')],
                 "text":[t.firstChild.wholeText.replace("\n"," ") #guarantee one line
                         for t in e.getElementsByTagName('text')
                         if t.firstChild.nodeType==4 #cdata, not signdata
                         ],
                 }
        for term in e.getElementsByTagName('term'):
            val = term.firstChild
            if val.nodeType==3: #text node
                entry['ksw'] = csw2ksw(val.wholeText)
            elif val.nodeType==4: #cdata
                entry['terms'].append(val.wholeText)
        rv.append(entry)
    return rv
        
def spml2tables(spmlfile,shape_data=None):
    """parse spml file and create files for entry-shapes and term-entry
    sgn.spml file doesn't seem to have any ^'s or $'s, so these are good chars
    """
    spml = parse_spml(spmlfile)
    deps = {'shapes':{},'paths':{}}
    es = open(FILES['entries'],'w')
    for entry in spml:
        cluster = ksw2cluster(entry.get('ksw',None))
        try:
            es.write('$'.join([entry['id'],
                               '^'.join(entry['terms']),
                               'S'.join([''.join(c) 
                                         for c in cluster]),
                               '',#'$'.join(entry['text']), #unicode import issue
                               ])+"\n")
        except UnicodeEncodeError:
            print "Entry %s was laden with too much blessed Unicode" % entry['id']
        for c in cluster:
            deps['shapes'][ c[0] ] = 1
            if shape_data: #output path #'s instead of shapes
                deps['paths'].update([(int(p),1) for p in 
                                      shape_data['shapes'][c[0]]['paths'] ])

    if shape_data:
        edeps = open(FILES['entry_dependencies'],'w')
        pathmin=open(FILES['pathmin'],'w')
        for p in sorted(deps['paths'].keys()):
            pathmin.write('$'.join(pathdata_struct(
                        shape_data['paths'][shape_data['ordered_paths'][p]]
                        ))+"\n")
        for s in sorted(deps['shapes'].keys()):
            edeps.write('$'.join(shapedata_struct(shape_data['shapes'],s))+"\n")
        edeps.close()
        pathmin.close()
    es.close()

def main():
    whattodo= dict([(a.split('=')[0],a.split('=').pop()) for a in  sys.argv])
    didsomething = False
    shape_data = None
    if '--download' in whattodo:
        print "Downloading not supported yet, sorry"
    if '--svg' in whattodo:
        shape_data = find_all_paths(whattodo['--svg'])
        didsomething = True
    if '--spml' in whattodo:
        spml2tables(whattodo['--spml'],shape_data)
        didsomething = True
    if not didsomething:
        print """
--download: gets sgn4.spml and svg1.zip, parses them and spits out files
--spml=<sgn4.spml> spits out succinct entries.txt and entry_deps.txt
--svg=<svg1_dir> spits out paths.txt and shapes.txt
"""
        

if __name__ == '__main__':
    exit = main()
    if exit:
        sys.exit(exit)


