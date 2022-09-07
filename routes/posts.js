var router = require('express').Router();
const passport = require('passport'); // install
const LocalStrategy = require('passport-local').Strategy;//install

router.get('/', function(req, res) {
    // res.sendFile(__dirname + '/index.html');
    res.render('index.ejs');
});

router.get('/write', loginCheck, function(req, res) {
    // res.sendFile(__dirname + '/write.html');
    res.render('write.ejs')
});

router.post('/add', loginCheck, function(req, res) {
    

    db.collection('counter').findOne({name : 'totalNumber'}, function(error, result) {// counter 라는 collection에 있는 db정보 중 name 이 totalNumber 인 데이터를 가져온다
        console.log(result.totalPost); // 총 게시물 개수

        var totalNumber = result.totalPost; // 0

        var push = {_id : totalNumber + 1, title : req.body.title, date : req.body.date, writer : req.user._id }// 작성자 정보 추가  

        /*  console.log(req.body.title); // body 까지만 쓰면 객체가 전달됨
        console.log(req.body.date); */
        db.collection('post').insertOne(push, function(error, result) {
            console.log('저장완료');

            // totalPost + 1
            db.collection('counter').updateOne({name : 'totalNumber'},{$inc /* operator  ex)$set 값 바꾸기*/ : {totalPost : 1}},function(error, result){
            if (error) {return console.log(error)}
            }); 
        });

        res.redirect('/list')
    });
  

   
});

router.get('/list', loginCheck, function(req, res) {

    db.collection('post').find().toArray(function(error, result) { // db에 저장된 post 라는 collection안의 모든 데이터를 꺼내기
        if (error) {return console.error}
        console.log(result);
        res.render('list.ejs', {posts : result}); //꺼낸 데이터 ejs파일에 집어넣기 
    });
});

router.delete('/delete', function(req, res) {
    console.log(req.body); // 자료 넘어올 때 숫자가 문자로 치환되어 넘어옴
    req.body._id = parseInt(req.body._id);

    var deleteData = {_id : req.body._id, writer : req.user._id} // 자신이 작성한 글만 삭제 가능

    db.collection('post').deleteOne(deleteData, function(error, result) {
        if (error) {return console.log(error)}
        console.log(result);
        if (result.deletedCount == 1) {
            console.log('삭제완료')
            res.status(200).send({ message : '성공했습니다.'}); // 요청 성공
        } else {
            console.log('삭제 실패');
            res.status(400).send({ message : '실패했습니다.'}); // 요청 실패
        }
    }); 
});

router.get('/detail/:id', loginCheck, function(req, res) {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(error, result) { // 파라미터로 넘어오면서 문자로 치환됨. 정수로 바꿔야함
        if (error) {return console.log(error)}
        console.log(result);
        if (result == null) {
            res.status(400).send({message : '데이터가 없습니다'});
        }
        res.render('detail.ejs', {data : result});
    });
    
});

router.get('/edit/:id', loginCheck, function(req, res) {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(error, result) {
        if (error) {return console.log(error)}
        console.log(result);
        if (result == null) {
            res.status(400).send({message : '데이터가 없습니다.'});
        }
        res.render('edit.ejs', {data : result});
    })
    
});

router.put('/edit', loginCheck, function(req, res) { // _id를 url의 파라미터에 넣어서 전송받아도 됨
    db.collection('post').updateOne({_id : parseInt(req.body._id)}, {$set : {title : req.body.title, date : req.body.date}}, function(error, result){
        if (error) {return console.log(error)}
        console.log('수정완료');
        res.redirect('/list');
    });
});


router.get('/search', function(req, res) {
    var searchCondition = [
        {
            $search: {
                index : 'titleSearch', // 만들었던 search index 이름
                text : {
                    query : req.query.value,
                    path : "title" // 제목 날짜 둘다 검사하고싶으면 ['제목', '날짜]
                }
            }
        },
        //{ $sort : {_id : 1}}, // id 오름차순으로 정렬
        //{ $limit : 10} // 상위 10개 까지만 검색
        //{ $project : {title : 1, _id:0, score: {$meta: "searchScore"}}} //위의 두개 조건 안쓸 때 검색 스코어 순으로 출력 가능 (검색 정확도)
    ]
    console.log(req.query);
    db.collection('post').aggregate(searchCondition).toArray(function(error, result) { //db 에 데이터가 많으면 찾는데 오래걸림. -> indexing(정렬) mongodb index, binary search 사용
        if (error) return console.log(error);
        if (!result) {
            return console.log('일치하는 결과가 없습니다.');
        } else {
            res.render('search.ejs', {posts : result});
        }
    });
}); //단어 띄어쓰기하면 or 검색, -붙이고 검색하면 제외가능, ""안에 넣으면 정확한 검색 가능, text index 쓰면 띄어쓰기 단위로 검색(한글이랑 맞지 않음)
    // 해결책 1. text index 사용하지 않고 검색할 문서의 양을 제한두기 (ex. 날짜) 2.mongodb 내부 search index 사용



    //미들웨어 함수 생성
function loginCheck(req, res, next) { // 로그인 후 세션이 있으면 req.user 가 항상 있음
    if (req.user) {
        next();
    } else {
        res.render('login.ejs');
    }
} 



    module.exports = router;
