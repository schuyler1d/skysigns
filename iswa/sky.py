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
    'pathsjs':'paths.js',
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
            shapefile.write(
                '$'.join(
                    (fkey,
                    ','.join(shapes[fkey]["paths"]),
                    ';'.join( shapes[fkey]["transforms"] )
                    ))+"\n")
        f.close()
    return {"paths":allpaths,
            "shapes":shapes,
            "attrs":attributes,
            "elts":elements,
            "cnt":cnt,
            "pathlen":len(allpaths),
            }

def pathdata_struct(path_ary):
    return [
        str(path_ary[2]),#number
        path_ary[0][0],#element first letter
        ('%sxx' % path_ary[3].get('fill',''))[1], #0 or f for fill
        path_ary[4] #goodattr
        ]

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
    pathjs=open(FILES['pathsjs'],'w')
    pathjs.write("window.SignPaths = [\n")
    def path_val(a,b):
        return allpaths[a][2]-allpaths[b][2]

    for p in sorted(allpaths, path_val):
        pathdata = pathdata_struct(allpaths[p])
        pathfile.write('$'.join(pathdata)+"\n")
        pathjs.write("['%s'],\n" % "','".join(pathdata[1:]))
    pathjs.write("'LAST'];\n")
    return {"count":cnt,"paths":allpaths,"shapes":allshapes}

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
    edeps = open(FILES['entry_dependencies'],'w')
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
                deps['paths'].update([(int(p),1) 
                                      for p in 
                                      shape_data['shapes'][c[0]]['paths'] ])
            
    for dep in sorted(deps['shapes'].keys()):
        edeps.write(str(dep)+"\n")
    es.close()
    edeps.close()

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

"""
hex system:

see bsw.php:
  isFill: 39a-39f ,isRot: 3a0-3af
  isISWA: 100-38b (general category)
   isWrit: 100-37e (general cat) 
     isHand: 100-204
       right hand: 0-7, left hand: 8-f (+8='flip')
       0:n,1:right hand+nw
       +30(hex) = broken (point forward)
       00:white, 10:half, 20: black
       10000 = 1 index fing
       10100 = round (open fist)
       10200 = thumb+fingers = out, bend, apart
       10300 = thumb+fingers = out, bend, touch
       10400 = thumb+finger = out, straight, apart (parallel)
       10500 = thumb+fingers = out, straight, touch
       10600 = crooked finger
       10700 = crooked finger, round

       11000 = 2 crooked fingers (index+middle)
       11000-11900 = 2 fingers = fore,index (all sqaure)
       12000-14300 = 3 fingers = combinations of thumb,fore,index
       14400 = 4 fingers, thumb in
       14500 = 4 curled fingers, thumb in
       15000-15900 = 5 fingers?
       15000 = 5 fingers, curled
       15a00-165 = flat,fingers together ('b hand' variations)
         16200-164= top of fingers folded in
       17600 = fist, open
       18600 = 3 fingers = 'w hand' (closed)
       18700 = 3 fingers = '6 hand' (round)
       19200 = just pinky
       19400 = just pinky+round hand
       19800 = just pinky (curled)
       19a00 = thumb,pinky (='Y' hand)
       20300 = fist, closed
     isMove: 205-2f6
       205 = '*', 206 = two (00=horz-03), three stars (10-13 rotated)
         207 = '|*|' for 1-2 stars
       208 = '+', 209 = 2-3 +'s in same pattern as 206
         20a = '|+|'
       20b-20d = '#'
       20e-210 = '[circle+dot]'
       211-213 = '@'
       214-215 = ??single and sandwiched air-foil shape
       216 = black dot, 217=??smaller black dot, 
          218=2-3 dots, 219, 2-3 smaller dots
          21a* = ????, 
       21b-21f = white dot (like black dot)
       220 = ??five dots alternating black/white
       221* = '^', '^^', etc.
         222 = ?smaller ^'s?
         223 = similar to 21a: two with an arrow arcing through
           224 = same but second ^ is flipped
         225 = 2 ^','^^'s on top of eachother
           226 = smaller
         227 = ?? ^ sandwiched between two small horiz lines
       228-
         228 = arrow, double (broken) 
         229 = arrow, single (broken) 
         22a-264 = arrow, double (connected)
           22b = arrow, long double(connected)
           22c = arrow, longer double(connected)
           22d =  "     even longer "
           22e = ??double with bar under (and lonely bar)
           22f = two double arrows (black, white heads)
           23a = crooked long double arrow
           23b = crooked at right angle double arrow
             23c,d = longer and longer
           23e = crooked arrow with another arrow for rotation
           23f-241 = acute angle
           242-244 = U-shaped arrow
           245-247 = lightning
           248-24a = w-shaped
           24b-24f = ??like 23e, but just straight, and sometimes 
                     with two rotating arrows
           25a-264 = ??dbl arrow with black piece in tail
         265-287 = single arrow 
            (?mostly same pattern as 0x22a+ for double)
           26a-    = *two single arrows beside eachother
              26b = ??bar beneath
             26c,26d = opposite directions (and with bar beneath)
             26e = crossing eachother
             26f = three
         289 = bendy double arrow
           290 = circular arrow, 291=bolder
           292-4 = hop, or w/bold or long
           295-7 = w/ loop  
           298-299 = double loop
           29a-f = wiggle
           2a0-1 = gamma-shaped
           2a2-4 = U with cross axis-marker
           2a5 = ??fish-bone
           2a8-2b6 = ?two bars and (loops, wiggles, gammas, etc)
         2b7-2e2 = arrow with black arrow-tail
                with various loops, wiggles, doubles, axes lengths..
            2d5-2d9 = u-shaped arrow with 'tail' by the arrowhead
            2da = one-hop single arrow
         2e3-2e6 = arrow, double, full closed loop
            different sizes, double-heads, etc.
         2e7-2ec = arrow single, full closed loop, elipse
         2ed-2f0 = ??white dot with arrow quarter turn/twist
         2f1-2f4 = dotted arrow
         2f5-2f7 = arrow head
     isDyn:  2f7-2fe
         2f8 = ?simultaneous or arrow arc?
         2f9-2fa= *'~'
         2fb = ??probably 'simultaneous' arc
           2fc = double, 2fd = crossing, 2fe=opposed
     isHead: 2ff-36c
     isTrunk: 36d-375
       374 = trunk arrows
       ?375 = head?
     isLimb: 376-37e
   isLoc: 37f-386
   isPunc: 387-38b

for search categories: (+ is for composition)
  (if not sure, then don't include it)
   context or facial expression:
     any head?
       eyebrow/mouth/nose/chin/ear
     any trunk (this is rare)
     any arm (context)
   touch contact: 
      touch/rub/hold/strike/brush
      +double/triple
   motion (using arms)
     straight,circle,other
     *pick from other sign
     +round(U,bend),sharp(right-angle,obtuse,acute,lightning)
     +left/right hand
     +plane: floor, chest, forward
     +from/away from body
     +simultaneous(ness)
   hand: Letter/number/other
                  [a-y1-8] minus j = 32+other
                  fist = a/s, point =1/g/L, f/9, 2/v, car=3, b=flat, ten=thumb, 
                   stupid=?g
                   common confusions: a/s,b/open,g/L/bent,k/2,v/bent,1/x,6/w,f/open,m/3-closed
                 --other
                    [sick/feel, 
                     open hand (thumb side/out),
                     'america'/'[applause]' hand (spread fingers)
                       'fester' = curled (probably with movement)'
                     'hard' = bent V
                     'moon/run' = curled L
                     'new' = curved hand
                     'airplane' - L+pinky (also 'iloveyou')
                        'camp'? different or 
                     'money'/'number'/'dinosaur'
                     'hope'= bent hands
                    ], 
               up-down/forward-back
               (palm: side-back-front/side-up-down)
               direction (compass)
       +motion: 
          curl/uncurl
          bend (back and forth?)
          piano fingers
          *pick from other sign
   +sequence symbol (arrows for what to do first/second)
     see 'restaurant'
     see 'tv'
     see 'city'
     see 'remember'
   

tests: 
  1. remote ajax
  2. coordinate click event in SVG
  3. print db counts
  4. 

"""
