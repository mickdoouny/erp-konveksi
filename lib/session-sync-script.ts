/**
 * Inline script run before React hydrates — mirrors erp_user cookie into localStorage
 * so auth guards never lose the session on LAN phones (Safari, slow storage, etc.).
 */
export const SESSION_SYNC_INLINE_SCRIPT = `(function(){try{var k="user",ls=window.localStorage;var m=document.cookie.match(/(?:^|;\\s*)erp_user=([^;]*)/);if(!m){try{ls.removeItem(k)}catch(e){}return}var raw=m[1];var b64=raw.replace(/-/g,"+").replace(/_/g,"/");while(b64.length%4)b64+="=";var json=atob(b64);var u=JSON.parse(json);if(!u||!u.id||!u.role){try{ls.removeItem(k)}catch(e){}return}var prev=null;try{prev=JSON.parse(ls.getItem(k)||"null")}catch(e){}if(!prev||prev.id!==u.id||prev.role!==u.role)ls.setItem(k,json)}catch(e){}})();`
