const express = require('express');
const app = express();
// 서버에 데이터 전송을 위한 코드
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));
const methodOverride = require('method-override'); // npm install method-override, put, delete 사용위함
app.use(methodOverride('_method'));
app.set('view engine', 'ejs'); //npm install ejs
app.use('/public', express.static('public')); // 미들웨어, static 파일을 보관하기 위해 public 폴더를 사용할 것임을 명시. 서버 중간에 작동
const MongoClient = require('mongodb').MongoClient;



var db;
MongoClient.connect('mongodb+srv://kgj:aa8525698**@cluster0.3ldg4pr.mongodb.net/?retryWrites=true&w=majority', function(error, client) {

    if (error) {return console.log(error)}

    db = client.db('todoapp');

    
    app.listen(8080, function() {
      console.log('listening on 8080');
    });
});


// 서버에서는 무조건 client로 응답을 보내줘야 함

app.get('/path', function(req, res) {
    res.send('hello');
});

app.get('/beauty', function(req, res) {
    res.send('beauty');
});

app.get('/', function(req, res) {
    // res.sendFile(__dirname + '/index.html');
    res.render('index.ejs');
});

app.get('/write', function(req, res) {
    // res.sendFile(__dirname + '/write.html');
    res.render('write.ejs')
});

app.post('/add', function(req, res) {
    

    db.collection('counter').findOne({name : 'totalNumber'}, function(error, result) {// counter 라는 collection에 있는 db정보 중 name 이 totalNumber 인 데이터를 가져온다
        console.log(result.totalPost); // 총 게시물 개수

        var totalNumber = result.totalPost; // 0

        /*  console.log(req.body.title); // body 까지만 쓰면 객체가 전달됨
        console.log(req.body.date); */
        db.collection('post').insertOne({_id : totalNumber + 1, title : req.body.title, date : req.body.date}, function(error, result) {
            console.log('저장완료');

            // totalPost + 1
            db.collection('counter').updateOne({name : 'totalNumber'},{$inc /* operator  ex)$set 값 바꾸기*/ : {totalPost : 1}},function(error, result){
            if (error) {return console.log(error)}
            }); 
        });

        res.redirect('/list')
    });
  

   
});

app.get('/list', function(req, res) {

    db.collection('post').find().toArray(function(error, result) { // db에 저장된 post 라는 collection안의 모든 데이터를 꺼내기
        if (error) {return console.error}
        console.log(result);
        res.render('list.ejs', {posts : result}); //꺼낸 데이터 ejs파일에 집어넣기 
    });
});

app.delete('/delete', function(req, res) {
    console.log(req.body); // 자료 넘어올 때 숫자가 문자로 치환되어 넘어옴
    req.body._id = parseInt(req.body._id);
    db.collection('post').deleteOne(req.body, function(error, result) {
        if (error) {return console.log(error)}
        console.log('삭제완료')
        res.status(200).send({ message : '성공했습니다.'}); // 요청 성공
    });
});

app.get('/detail/:id', function(req, res) {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(error, result) { // 파라미터로 넘어오면서 문자로 치환됨. 정수로 바꿔야함
        if (error) {return console.log(error)}
        console.log(result);
        if (result == null) {
            res.status(400).send({message : '데이터가 없습니다'});
        }
        res.render('detail.ejs', {data : result});
    });
    
});

app.get('/edit/:id', function(req, res) {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(error, result) {
        if (error) {return console.log(error)}
        console.log(result);
        if (result == null) {
            res.status(400).send({message : '데이터가 없습니다.'});
        }
        res.render('edit.ejs', {data : result});
    })
    
});

app.put('/edit', function(req, res) { // _id를 url의 파라미터에 넣어서 전송받아도 됨
    db.collection('post').updateOne({_id : parseInt(req.body._id)}, {$set : {title : req.body.title, date : req.body.date}}, function(error, result){
        if (error) {return console.log(error)}
        console.log('수정완료');
        res.redirect('/list');
    });
})
           