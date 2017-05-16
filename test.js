'use strict';
const jade = require('jade');
const assert = require('assert');

//jadeのテンプレートにおけるXSS脆弱性のテスト
const html = jade.renderFile('./views/posts.jade',{
  posts: [{
    id: 1,
    content: '<script>alert(\'test\');</script>',
    postedBy: 'guest1',
    trackingCookie: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }],
  user: 'guest1'
});

//スクリプトタグがエスケープされて含まれていることをチェック
assert(html.indexOf('&lt;script&gt;alert(\'test\');&lt;/script&gt;') > 0);
// jade では、
// < を &lt; に置換
// > を &gt; に置換
// に置換することで、script タグが実行されないようなエスケープ処理を行っています。
// なお、 lt は less than の略で「小なり」を表し、gt は greater than の略で「大なり」を表しています。
// HTML 上で大なり小なりは、< を &lt; に置換し、> を &gt; に置換することで正しく表示されます。
console.log('テストが正常に完了しました');
