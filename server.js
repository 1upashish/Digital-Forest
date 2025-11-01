// WS bridge broadcaster (Node.js)
// npm i ws
const http = require('http'); const WebSocket = require('ws');
const server = http.createServer((req,res)=>{ res.writeHead(200); res.end('ICC25 WS Bridge'); });
const wss = new WebSocket.Server({ server });
wss.on('connection', ws => {
  ws.on('message', msg => {
    try{ const data=JSON.parse(msg.toString()); if(data.type==='pledge'){ wss.clients.forEach(c=>c.readyState===WebSocket.OPEN && c.send(JSON.stringify(data))); } }catch(e){}
  });
});
server.listen(process.env.PORT||8080, ()=>console.log('WS bridge on ws://localhost:'+ (process.env.PORT||8080)));
