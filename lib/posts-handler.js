'use strict';
const crypto = require('crypto');
const jade = require('jade');
const Cookies = require('cookies');
const util = require('./handler-util');
const Post = require('./post');
const moment = require('moment-timezone');

function handle(req, res){
  const cookies = new Cookies(req, res);

  const trackingId = addTrackingCookie(cookies, req.user);
  switch(req.method){
    case 'GET':
      res.writeHead(200,{
        'Content-type':'text/html',
        'charset':'utf-8'
      });
      Post.findAll({
        order:'id DESC' //後で投稿されたものが先に表示されるように並べ替え
      }).then((posts)=>{
        posts.forEach((post)=>{
          //decodeURIComponentは半角スペースを + に変換してしまうのでそれを戻す
          post.content = post.content.replace(/\+/g, ' ');
          //投稿時刻を見やすい書式かつ日本時間にしたものをpost.formattedCreatedAtに保存
          post.formattedCreatedAt = moment(post.createdAt).tz('Asia/Tokyo').format('YYYY年MM月DD日 HH時mm分ss秒');
        });
        //全ての投稿内容を再描画
        res.end(jade.renderFile('./views/posts.jade',{ 
          posts: posts,
          user: req.user
        }));
        // /postsへgetリクエストがくるたびに誰が閲覧したかログに残す
        console.info(
          `閲覧されました： user ${req.user},` +
          `trackingId: ${trackingId},` +
          `remoteAddress: ${req.connection.remoteAddress},` +
          `userAgent: ${req.headers['user-agent']}`
        );
      });
      break;
    case 'POST':
      req.on('data',(data)=>{
        const decoded = decodeURIComponent(data);
        const content = decoded.split('content=')[1]; //内容は key=value の形式。フォームで設定した contentキーの値を取得。
        console.info('投稿されました: ' + content);
        Post.create({
          content: content,
          trackingCookie: trackingId,
          postedBy: req.user
        }).then(()=>{
          handleRedirectPosts(req, res);              //投稿してdb保存後は一覧へリダイレクト
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);                     //未対応メソッドは例外ページを表示させる
      break;
  }
}

function handleDelete(req, res) {
  //req.setEncoding('utf8');                      //３）実はこのコードを使えば、dataイベントが提供するチャンクがutf8になるので ２）のデコードが不要になる
  switch (req.method) {
    case 'POST':
      req.on('data', (data) => {                  //１）dataイベントはBufferオブジェクト（バイト配列）を提供する。
        console.log(data);                        //=> <Buffer 69 64 3d 35>

        const decoded = decodeURIComponent(data); //２）バイト配列なのでデコードが必要。デコードすればフォームから送られてきたデータになる。
        console.log(decoded);                     //=> id=7

        const id = decoded.split('id=')[1];       //=> 7
        Post.findById(id).then((post) => {        //投稿データが取得できたら
          if (req.user === post.postedBy || req.user === 'admin') { //basic認証のユーザー名と投稿データのユーザー名が一緒、もしくは管理人なら　（※）
            post.destroy();                       //投稿を削除
            console.info(                         //削除ログを残す
              `削除されました: user: ${req.user}, ` +
              `remoteAddress: ${req.connection.remoteAddress}, ` +
              `userAgent: ${req.headers['user-agent']} `
            );
          }
          handleRedirectPosts(req, res);          //一覧ページにリダイレクト
        });
      });
      break;
    default:                                      //url直うちなどで/posts?delete=1にアクセスした場合（GETなど）、例外ページに飛ばす
      util.handleBadRequest(req, res);
      break;
  }
}
//※ 認証と認可
// この実装では、そもそも投稿した本人にしか削除ボタンは表示されないようになっているのに、サーバー上でも改めて投稿した本人かどうかを if 文でチェックしています。
// これは今の実装のままではサーバーに来た HTTP のリクエストが、どのようなクライアントからのリクエストであるかを完全に保証することはできないためです。
// 例えば、他の認証ユーザーが悪意を持って、 curl などのコマンドラインツールから他人の投稿の削除を試みる可能性があります。
// そのようなリクエストが来た場合に削除が行われないよう、サーバー上でもしっかりチェックを行う必要があるのです。
// このような特定の機能を利用する権限があるかを、認証されたユーザーに対して確認し、資格に応じて許可することを認可といいます。
// 認証と認可は、セキュリティ上非常に重要な機能となっており、かならずサーバー上でチェックする必要があります。


// function addTrackingCookie(cookies){
//   if(!cookies.get('tracking_id')){                                           //'tracking_id'のクッキーがブラウザになければ
//     const trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
//     const tomorrow = new Date(new Date().getTime() + (1000 * 60 * 60 * 24));
//     //ミリ秒を渡してDateオブジェクトを生成すると、
//     //そのミリ秒が指し示す時刻の Date オブジェクトが生成できます。
//     //現在のミリ秒: new Date().getTime()
//     //1 日分のミリ秒: 1000 * 60 * 60 * 24
//     cookies.set('tracking_id', trackingId, { expires: tomorrow });           
//   }
// }

/**
 * Cookieに含まれているCookieに含まれているトラッキングIDに異常がなければその値を返し、
 * 存在しない場合や異常なものである場合には、再度作成しCookieに付与してその値を返す
 * @param {Cookies} cookies
 * @param {String} userName
 * @return {String} トラッキングID
 */
function addTrackingCookie(cookies, userName){
  const requestedTrackingId = cookies.get('tracking_id');                        //クッキーにtracking_idがそもそもあるかどうかの判定の結果を変数に入れる
  if(isValidTrackingId(requestedTrackingId, userName)){
    return requestedTrackingId;                                                  //クッキーにtracking_idがあって、かつ検証も通ればそのまま返す
  } else {                                                                       //クッキーにtracking_idがそもそもない、もしくは検証に引っかかった時。
    //tracking_idを新規作成し、クッキーにセット
    //tracking_idの値は(ランダムな整数値)_(ランダムな整数値 と ユーザー名 を結合したもののハッシュ値)
    const originalId = parseInt(crypto.randomBytes(8).toString('hex'), 16)       //推測されにくい8バイトの整数値を生成して
    const tomorrow = new Date(new Date().getTime() + (1000 * 60 * 60 * 24));     //今の時刻の1日後のdateオブジェクト作って
    //ミリ秒を渡してDateオブジェクトを生成すると、
    //そのミリ秒が指し示す時刻の Date オブジェクトが生成できます。
    //現在のミリ秒: new Date().getTime()
    //1 日分のミリ秒: 1000 * 60 * 60 * 24
    const trackingId = originalId + '_' + createValidHash(originalId, userName); //「ランダムな整数値」と「ランダムな整数値とユーザ名から作ったハッシュ値」からなる値を作成
    cookies.set('tracking_id', trackingId, { expires: tomorrow });               //クッキーのtracking_idに、先ほど作成した値を設定
    return trackingId;
  }
}

function isValidTrackingId(trackingId, userName){
  if(!trackingId){                                                               //クッキーにtracking_idがそもそもなかった場合
    return false;                                                                //falseを返してtracking_idを新規作成させる
  }
  //クッキーにtracking_idがあった場合、他ユーザーのtracking_idをハイジャックをしていない検証する
  const splitted = trackingId.split('_');                          //1
  const originalId = splitted[0];                                  //1
  const requestedHash = splitted[1];                               //1
  return createValidHash(originalId, userName) === requestedHash;  //4
}
const secretKey =
  '5a69bb55532235125986a0df24aca759f69bae045c7a66d6e2bc4652e3efb43da4' +
  'd1256ca5ac705b9cf0eb2c6abb4adb78cba82f20596985c5216647ec218e84905a' +
  '9f668a6d3090653b3be84d46a7a4578194764d8306541c0411cb23fbdbd611b5e0' +
  'cd8fca86980a91d68dc05a3ac5fb52f16b33a6f3260c5a5eb88ffaee07774fe2c0' +
  '825c42fbba7c909e937a9f947d90ded280bb18f5b43659d6fa0521dbc72ecc9b4b' +
  'a7d958360c810dbd94bbfcfd80d0966e90906df302a870cdbffe655145cc4155a2' +
  '0d0d019b67899a912e0892630c0386829aa2c1f1237bf4f63d73711117410c2fc5' +
  '0c1472e87ecd6844d0805cd97c0ea8bbfbda507293beebc5d9';
//秘密鍵の作り方
//require('crypto').randomBytes(256).toString('hex');
//Node.js の crypto モジュールの randomBytes 関数は、推測されづらいランダムなバイト列を生成することができます。
//toString 関数を引数 hex という文字列で実行することで、 16 進数で表されたランダムなバイト列を文字列として得ることができます。

function createValidHash(originalId, userName){
  //ハッシュ関数にSHA-1 アルゴリズムを利用して、 元々のトラッキング ID とユーザー名を結合した文字列に対してメッセージダイジェストを作成しています。
  //最終的にそのメッセージダイジェストを、 16 進数の文字列として返す
  const sha1sum = crypto.createHash('sha1');
  sha1sum.update(originalId + userName + secretKey);               //2,3
  return sha1sum.digest('hex');
}
// 1) リクエストで送られた Cookie の値の「元々のトラッキング ID 」と「元々のトラッキング ID とユーザー名を結合したもののハッシュ値」を分離する
// 2) 「元々のトラッキング ID 」と「ユーザー名」と「秘密鍵」を結合した文字列をつくる
// 3) 結合した文字列をハッシュ関数にかけて、ハッシュ値を得る
// 4) 「送られてきたハッシュ値」と「サーバー上で生成したハッシュ値」が同じであるかを検証する。
//    もし偽装されたものであれば、ハッシュ値が異なったり、または付与されていないものとなる


function handleRedirectPosts(req, res){
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle: handle,
  handleDelete: handleDelete
}