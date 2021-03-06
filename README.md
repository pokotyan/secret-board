### 要件

- 認証ができる
- 認証した人だけが投稿内容を閲覧できる
- 認証した人だけが投稿できる
- 自身の投稿内容を削除できる
- 管理人機能
- 管理人の投稿だとわかる
- 管理人は全ての投稿を削除できる
- 管理人はどのアカウントの投稿かわかる
- 匿名であるけれども同じユーザーであることを認識でき、自作自演を防止できる


### URI設計

| メソッド           | パスとクエリ      |処理                           |
|------------------|------------------|------------------------------|
| GET              | /posts           | 投稿一覧                       |
| POST	           | /posts           | 投稿、投稿後の一覧へのリダイレクト |
| POST             | /posts?delete=1  | 削除                          |
| GET              | /logout          | ログアウト                     |
| GET              | /favicon.ico     | ファビコン                     |

### モジュール設計

| ファイルパス           | モジュールの役割                      |
|----------------------|-----------------------------------|
| index.js             | HTTP サーバーを起動する                |
| lib/router.js	       | リクエストを処理を行うハンドラに振り分ける |
| lib/posts-handler.js | /posts のリクエストを処理する          |
| lib/handler-utils.js | その他のリクエストを処理する            |
| lib/post.js          | 投稿を追加、取得、削除する              |
