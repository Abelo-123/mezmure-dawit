(function(){
  var out=[], bad=0, A=window.__app;
  try{
    for(var n=1;n<=A.MAX;n++){
      A.go(n); A.setAm(true);
      var rs=A.rows(n), vs=document.querySelectorAll('#text .v'), as=document.querySelectorAll('#text .v .a');
      var title=document.getElementById('title').textContent;
      var ok = vs.length===rs.length && as.length===rs.length && title.indexOf('Psalm '+n)>0 && title.indexOf('መዝሙር '+A.eth(n))===0;
      for(var i=0;ok&&i<rs.length;i++){
        if(vs[i].querySelector('.g').textContent!==rs[i].g.join(' ')) ok=false;
        var at=as[i].textContent; if(at!==(rs[i].a.length?rs[i].a.join(' '):'—')) ok=false;
        if(vs[i].dataset.n!==String(rs[i].n)) ok=false;
      }
      if(!ok){bad++; out.push('FAIL '+n);}
    }
  }catch(e){bad++; out.push('EXC '+e.message);}
  var pre=document.createElement('pre'); pre.id='selftest'; pre.textContent='SELFTEST psalms='+A.MAX+' failures='+bad+' '+out.join(',');
  document.body.appendChild(pre);
})();
