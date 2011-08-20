#!/usr/bin/python
"""
http://www.signbank.org/signpuddle1.6/glyphogram.php?text=AS14c50S14c58S20600S20600S36d00S36d00M41x34S36d00n21xn14S36d00n21x11S20600n22x23S206000x23S14c5017x1S14c58n42x2&pad=10
--download: gets sgn4.spml and svg1.zip, parses them and spits out files
--spml=<sgn4.spml> spits out succinct entries.txt
--svg=<svg1_dir> spits out paths.txt and shapes.txt
"""
import re,sys,os
from xml.dom.minidom import parse

FILES = {
    'paths':'paths.txt',
    'shapes':'shapes.txt',
    'entries':'entries.txt',
}

#global incrementer
x = {'n':-1}
def inc():
    x['n'] = x['n']+1
    return x['n']

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
                    goodattr = re.sub(r'(.\d{3})\d+',r'\1',
                                      attrs.get('d','SKY').replace("\n"," "))
                allpaths[p[0]] = [p[1],p[2],inc(),attrs,goodattr]
            shapes[fkey]["paths"].append(str(allpaths[p[0]][2]))
        shapes[fkey]["transforms"] = [
            re.sub(r'(.\d{3})\d+',r'\1',re.sub(r'(\w)\w+\(',r'\1(',t))
            for t in re.findall(r'<g[^<]+transform="([^"]+)"',txt)]
        if shapefile:
            shapefile.write(
                '$'.join(
                    (fkey,
                    ','.join(shapes[fkey]["paths"]),
                    ';'.join( shapes[fkey]["transforms"] )
                    ))+"\n")
        f.close()
    return (allpaths,shapes,attributes,elements,cnt,len(allpaths))

#print find_paths(sys.argv[1],shapefile=open('hi.txt','w'))
    
def find_all_paths(dir):
    allpaths={}
    cnt = 0
    shapefile=open(FILES['shapes'],'w')
    for dname in sorted(os.listdir(dir)):
        path = os.path.join(dir,dname)
        if os.path.isdir(path):
            d = find_paths(path,allpaths,shapefile)
            cnt += d[4]
    pathfile=open(FILES['paths'],'w')
    def path_val(a,b):
        return allpaths[a][2]-allpaths[b][2]

    for p in sorted(allpaths, path_val):
        path = allpaths[p]
        pathfile.write(
            '$'.join([
                str(path[2]),#number
                path[0][0],#element first letter
                ('%sxx' % path[3].get('fill',''))[1], #0 or f for fill
                path[4] #goodattr
                ])+"\n")
    return (cnt,len(allpaths))

#print find_all_paths(sys.argv[1])



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
        
def spml2tables(spmlfile):
    """parse spml file and create files for entry-shapes and term-entry
    sgn.spml file doesn't seem to have any ^'s or $'s, so these are good chars
    """
    spml = parse_spml(spmlfile)
    es = open(FILES['entries'],'w')
    for entry in spml:
        es.write('$'.join([entry['id'],
                           '^'.join(entry['terms']),
                           'S'.join([''.join(c) 
                                     for c in ksw2cluster(entry['ksw'])]),
                           '',#'$'.join(entry['text']), #unicode import issue
                           ])+"\n")
    es.close()

#maybe total is 7M?

class Phrase: #2.9M
    ('term') #<term> -- when CDATA it's the english, when text, then encoded
    ('comment') #<text>
    ('src') #<src> who provided it
    ('region') #add this
    ('usr', #creator
     'cdt', #create time?
     'mdt', #modified time?
     'id'
     )

class PhraseShapes:
    ('phraseid')
    ('shapeid')
    ('x')
    ('y')
    ('col')

class Shape:
    #14c07$0,2,4$transform(1) scale(1,1)$scale(2)
    ('code','id') #14c07
    ('transform')

class ShapePaths:
    ('shapecode')
    ('pathid')

class Path: #30,000 * 80[average path?] = 2.4M
    ('type','') #rect,path
    ('attributes','') #
    ('?id','') #

#
#<g transform="scale(0.0662393346391,0.0662393346391)">
#<g transform="translate(0,363) scale(1.509677,-1.509677)">
# note: scaling after translation
    
# Sign writing cheat sheet:
#    1. mirror perspective 
#    2. hand shapes: 
#         palm=white, back-of-hand=black, up/forward (broken finger=forward)
#         fist types: closed (square) ,open
#    3. movement: 
#         arrows: single (forward/back plane), double (up/down plane), crossbars, (white-head=left hand) (thick part of arrow (tail or just below head) is closer to body)
#         modifiers: ~, @ (rub (in a circle, unless arrows)), dot (in arrow=toward body diagonally, over finger=joint closes, white over finger=joint opens), dot-circle (brush), etc
#              * = contact
#               'tie' (bottom half-circle) = simultaneous
#              |*| = in between
#              + = hold
#              # = strike
#              \/ = bend fingers (down=closed,up=open, double=drum fingers)
#    4. face, body, shoulders
#    5. ?asl alphabet

# Android app
# reverse search
#   hand(s)
#   motion (arrows, douple-tap?)
#   context (face, arm
