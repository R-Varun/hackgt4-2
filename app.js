var bodyParser = require('body-parser')
var express = require('express')
var app = express()
var port = process.env.PORT || 5000;
var path = require('path');
var server = require('http').createServer(app);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
var config = require('./config.js');
const session = require('express-session')


var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });


//Auth ----
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        console.log(file)
      cb(null, Date.now() + '.mp3') //Appending .jpg
    }
  })
  var upload = multer({ storage: storage });
  
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
  

  

// var upload = multer({ dest: 'uploads/' });
var fs = require('fs');
var needle = require('needle');
// var config = require("./config.js")
const bcrypt = require('bcrypt')
const saltRounds = 10;
var redis = require('redis');

app.post('/upload', upload.single('audio'), function (req, res, next) {
    console.log(req.file.filename);
    var filename = req.file.filename;
    console.log("processing file " + filename);
    
    var options = {
        headers: 
       { "Content-Type": "audio/wav",
         "Transfer-Encoding": "chunked"},
       username: config.IBM_USER,
       password: config.IBM_PASS
     }
    needle.post(config.url, fs.createReadStream("uploads/" + filename), options, function(err, resp) {
        // console.dir(resp.body) 
        console.dir(resp.body.results)
        // res.send(resp.body);
        var spk = resp.body["speaker_labels"];
        console.dir(spk)
        
        var by_utterance = []
        try {
            var word_time = {}
            word_time = {}
            // res.send(resp.body.results);
            resp.body.results.forEach(function(thing) {
                
            
                thing.alternatives[0].timestamps.forEach(function (item) {
                    word_time[item[1]] =   item[0];
                })
            });
            
            spk.forEach(function (item) {
                var start = item.from;
                var speaker = item.speaker;
                var index = by_utterance.length - 1
                if (by_utterance[index] == null || by_utterance[index].speaker != speaker) {
                    console.log(speaker)
                    by_utterance.push({});
                    curObj = by_utterance[by_utterance.length - 1];
                    curObj.speaker = speaker;
                    curObj.utterance = word_time[start];
                } else {
                    by_utterance[index].utterance += " " + word_time[start];
                }
            });

            res.send({"status" : "FAILURE", "utter" : by_utterance, "labels" :resp.body});
            return;
            
        } catch (e) {
            res.send({"status" : "FAILURE"});
            return;
        }
    });		 
});



app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))
app.post('/login', function (req, res) {
  var user = req.body.user;
  var pass = req.body.pass;
  checkCred(user, pass, function(isValid) {
    if (isValid) {
      req.session["user"] = user;
      res.send({"status":"SUCCESS"});
    } else {
      res.send({"status":"FAILURE"});
    }

  })

})

var client = redis.createClient(); //creates a new client
client.on('connect', function() {
  console.log('connected Redis');
});


    


//populate what I want
bcrypt.genSalt(saltRounds, function(err, salt) {
  bcrypt.hash("ddd", salt, function(err, hash) {
      // Store hash in your password DB.
      client.set('creds', JSON.stringify({"dd":hash}));
      console.log(hash)
      
  });
});






function checkCred(user, pass, callback) {
  client.get('creds', function(err, reply) {
    if (err) {
      callback(false);
      return;
    }
    console.log(reply)
    
    reply = JSON.parse(reply);
    console.log(reply)
    var t_user = reply[user];
    if (t_user == null || typeof t_user === 'undefined') {
      console.log(t_user)
      callback(false);
      return;
    }

    bcrypt.compare(pass,t_user, function(err, res) {
      console.log(t_user);
      console.log(pass);
      console.log(res);
      // res == true
      callback(res)
      return;
    });
  });
}





app.get('/', function(req, res){
  
});


server.listen(port, function () {
  console.log("server running on port: " + port.toString())
})