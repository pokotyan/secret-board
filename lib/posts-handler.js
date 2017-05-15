'use strict';
const jade = require('jade');

function handle(req, res){
  switch(req.method){
    case 'GET':
      res.writeHead(200,{
        'Content-type':'text/html',
        'charset':'utf-8'
      });
      res.end(jade.renderFile('./views/posts.jade',{}));
      break;
    case 'POST':
      break;
    default:
      break;
  }
}

module.exports = {
  handle: handle
}