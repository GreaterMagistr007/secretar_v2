import sys
def parse(c):
    c=c.strip().lstrip('#')
    if len(c)==3: c=''.join(ch*2 for ch in c)
    return tuple(int(c[i:i+2],16) for i in (0,2,4))
def lin(v):
    v/=255.0
    return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
def lum(rgb):
    r,g,b=[lin(x) for x in rgb]
    return 0.2126*r+0.7152*g+0.0722*b
def ratio(a,b):
    la,lb=lum(parse(a)),lum(parse(b))
    hi,lo=max(la,lb),min(la,lb)
    return (hi+0.05)/(lo+0.05)
def comp(fg,alpha,bg):
    f,b=parse(fg),parse(bg)
    return '#%02x%02x%02x'%tuple(round(f[i]*alpha+b[i]*(1-alpha)) for i in range(3))
args=sys.argv[1:]; i=0
while i<len(args):
    if args[i]=='--comp':
        e=comp(args[i+1],float(args[i+2]),args[i+3])
        print(f"comp {args[i+1]}@{args[i+2]} on {args[i+3]} -> {e}; ratio {ratio(e,args[i+3]):.2f}"); i+=4
    else:
        print(f"{args[i]} on {args[i+1]} = {ratio(args[i],args[i+1]):.2f}"); i+=2
