/* English Studio - Reading: two independent scroll panes */
(function(){
  if(!/reading\.html$/.test(location.pathname))return;
  function apply(){
    if(document.getElementById('reading-independent-scroll-style'))return;
    const style=document.createElement('style');
    style.id='reading-independent-scroll-style';
    style.textContent=`
      html,body{height:100%;overflow:hidden}
      main.wrap{height:calc(100vh - 108px);min-height:0;display:flex;flex-direction:column}
      #app{min-height:0;flex:1;display:flex;flex-direction:column}
      #app>.layout{min-height:0;height:100%;overflow:hidden}
      #app>.layout>.pane{min-height:0;height:100%;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain}
      @media(max-width:800px){
        html,body{height:auto;overflow:auto}
        main.wrap{height:auto;min-height:0;display:block}
        #app{display:block;min-height:0}
        #app>.layout{height:auto;overflow:visible}
        #app>.layout>.pane{height:auto;max-height:none;overflow:visible;overscroll-behavior:auto}
      }
    `;
    document.head.appendChild(style);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
