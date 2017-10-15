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
var uniqid = require("uniqid");
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });
//Session ----
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }))

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
  
// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });
  

  

// var upload = multer({ dest: 'uploads/' });
var fs = require('fs');
var needle = require('needle');
// var config = require("./config.js")
const bcrypt = require('bcrypt')
const saltRounds = 10;
var redis = require('redis');

app.post('/upload', upload.single('audio'), function (req, res, next) {
    
    if (!req.session["user"]) {
        res.send({"status" : "FAILURE", "reason" : "Must be logged in "})
        return;
    }
    
    console.log(req.file.originalname);
    var ogName  =  req.file.originalname;
    var filename = req.file.filename;
    console.log("processing file " + filename);
    
    var options = {
        headers: 
       { "Content-Type": "audio/wav",
         "Transfer-Encoding": "chunked"},
       username: config.IBM_USER,
       password: config.IBM_PASS
     }
    needle.post(config.IBM_URL, fs.createReadStream("uploads/" + filename), options, function(err, resp) {
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
            //find the sentiment of the entirty
            var transcript = "";
            resp.body.results.forEach(function(item) {
                transcript += item.alternatives[0].transcript;
            });

            // run tone analysis
            var options = {
               username: config.TONE_USER,
               password: config.TONE_PASS,
               json: true
             }
             needle.post(config.TONE_URL, {"text" : transcript}, options, function(err, resp) {
                if (err) {
                    res.send({"status" :"FAILURE"});
                    return;
                } else {
                    res.send({"status" : "SUCCESS", "by_utterance" : by_utterance, "tones": resp.body});
                    //store this in user's table as well
                    client.hgetall(req.session.user + "-meetings", function (err, obj) {
                        if (err) {
                            console.log("----- errr");
                            console.log(err);
                            return;
                        }
                        var id = uniqid();
                        if (obj == null) {
                            obj = {};
                            obj[ogName] = id;
                        } else {
                            obj[ogName] = id;
                        }
                        client.hmset(req.session["user"]+ "-meetings", objToArr(obj), function (err, res) {});
                        //now set the meeting with ID
                        client.set(id, JSON.stringify({"name" : ogName, "by_utterance" : by_utterance, "tones": resp.body}))
                    });

                }
             });

            // now iterate through utterances and put in jira if needed
            by_utterance.forEach(function(item) {
                console.log(item)
                checkSubmitJira(item.utterance, function(err, response) {
                    if(!err) {
                        console.log(response.body);
                    }
                    console.log(err);

                })
            });
            
            return;
            
        } catch (e) {
            console.log(e)
            res.send({"status" : "FAILURE", "reason" : e});
            return;
        }
    });		 
});

app.post('v2/upload', upload.single('audio'), function (req, res, next) {
    
    
    var user = "dd";
    console.log(req.file.originalname);
    var ogName  =  req.file.originalname;
    var filename = req.file.filename;
    console.log("processing file " + filename);
    
    var options = {
        headers: 
       { "Content-Type": "audio/wav",
         "Transfer-Encoding": "chunked"},
       username: config.IBM_USER,
       password: config.IBM_PASS
     }
    needle.post(config.IBM_URL, fs.createReadStream("uploads/" + filename), options, function(err, resp) {
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
            //find the sentiment of the entirty
            var transcript = "";
            resp.body.results.forEach(function(item) {
                transcript += item.alternatives[0].transcript;
            });

            // run tone analysis
            var options = {
               username: config.TONE_USER,
               password: config.TONE_PASS,
               json: true
             }
             needle.post(config.TONE_URL, {"text" : transcript}, options, function(err, resp) {
                if (err) {
                    res.send({"status" :"FAILURE"});
                    return;
                } else {
                    res.send({"status" : "SUCCESS", "by_utterance" : by_utterance, "tones": resp.body});
                    //store this in user's table as well
                    client.hgetall(user + "-meetings", function (err, obj) {
                        if (err) {
                            console.log("----- errr");
                            console.log(err);
                            return;
                        }
                        var id = uniqid();
                        if (obj == null) {
                            obj = {};
                            obj[ogName] = id;
                        } else {
                            obj[ogName] = id;
                        }
                        client.hmset(user+ "-meetings", objToArr(obj), function (err, res) {});
                        //now set the meeting with ID
                        client.set(id, JSON.stringify({"name" : ogName, "by_utterance" : by_utterance, "tones": resp.body}))
                    });

                }
             });

            // now iterate through utterances and put in jira if needed
            by_utterance.forEach(function(item) {
                console.log(item)
                checkSubmitJira(item.utterance, function(err, response) {
                    if(!err) {
                        console.log(response.body);
                    }
                    console.log(err);

                })
            });
            
            return;
            
        } catch (e) {
            console.log(e)
            res.send({"status" : "FAILURE", "reason" : e});
            return;
        }
    });		 
});

app.get("/meeting", function(req, res) {
    var user = req.session.user;
    if (typeof user === 'undefined' || user == null) {
        res.send({"status": "FAILURE", "reason" : "not logged in!"});
        return;
    }
    meeting = req.query.name;
    //find meeting's ID from user's list
    client.hgetall(user+ "-meetings", function(err, obj) {
        if (err) {
            console.log(err);
            res.send({"status": "FAILURE", "reason" :"user not found!"});
            return;
        }
        if (obj == null) {
            res.send({"status" : "FAILURE"});
            return;
        }
        //obj is keyvalue pair of all meetings
        var meetingID = obj[meeting];
        if (typeof meetingID === 'undefined') {
            res.send({"status" : "FAILURE"});
            return;
        }
        //lookup meeting ID
        client.get(meetingID, function (err, meet) {
            if (err) {
                console.log(err);
                res.send({"status": "FAILURE", "reason" :"meeting not found!"});
                return;
            }
            meet = JSON.parse(meet);
            res.send({"status" : "SUCCESS", "data" : meet});

        })
    });
});


app.get("/v2/meeting", function(req, res) {
    var user = req.query.user;
    
    meeting = req.query.name;
    //find meeting's ID from user's list
    client.hgetall(user+ "-meetings", function(err, obj) {
        if (err) {
            console.log(err);
            res.send({"status": "FAILURE", "reason" :"user not found!"});
            return;
        }
        if (obj == null) {
            res.send({"status" : "FAILURE"});
            return;
        }
        //obj is keyvalue pair of all meetings
        var meetingID = obj[meeting];
        if (typeof meetingID === 'undefined') {
            res.send({"status" : "FAILURE"});
            return;
        }
        //lookup meeting ID
        client.get(meetingID, function (err, meet) {
            if (err) {
                console.log(err);
                res.send({"status": "FAILURE", "reason" :"meeting not found!"});
                return;
            }
            meet = JSON.parse(meet);
            res.send({"status" : "SUCCESS", "data" : meet});

        });
    });
});

//no params
app.get("/meetings", function(req, res) {
    var user = req.session.user;
    if (typeof user === 'undefined' || user == null) {
        res.send({"status": "FAILURE"});
        return;
    }
    console.log(user);
    client.hgetall(user+ "-meetings", function(err, obj) {
        if (err) {
            console.log(err);
            res.send({"status": "FAILURE", "reason" :"user not found!"});
            return;
        }
        if (obj == null) {
            res.send({"status" : "SUCCESS", "meetings" : []});
            return;
        }
        res.send({"status" : "SUCCESS", "meetings" : Object.keys(obj)});
    });
})



app.get("/v2/meetings", function(req, res) {
    user = req.query.user;
    client.hgetall(user+ "-meetings", function(err, obj) {
        if (err) {
            console.log(err);
            res.send({"status": "FAILURE", "reason" :"user not found!"});
            return;
        }
        if (obj == null) {
            res.send({"status" : "SUCCESS", "meetings" : []});
            return;
        }
        res.send({"status" : "SUCCESS", "meetings" : Object.keys(obj)});
    });
});





app.get('/login', function (req, res) {
  var user = req.query.user;
  var pass = req.query.pass;
  checkCred(user, pass, function(isValid) {
    if (isValid) {
      req.session["user"] = user;
      res.send({"status":"SUCCESS"});
    } else {
      res.send({"status":"FAILURE"});
    }

  })

});


function objToArr(aObj) {
    var retList = []
    Object.keys(aObj).forEach(function(item) {
        retList.push(item);
        retList.push(aObj[item]);

    })
    return retList;
}

app.get('/logout', function (req, res) {
    req.session.user = undefined;
    res.send({"status" :"SUCCESS"});
});

var client = require('redis').createClient(process.env.REDIS_URL); //creates a new client
client.on('connect', function() {
  console.log('connected Redis');
});


function checkSubmitJira(qs, callback) {
    

    needle.get(config.LUIS_URL + qs, function(err, resp) {
        if (err) {
            callback(err, resp);    
        }
        console.log(resp.body)
        try {
            var intent = resp.body.topScoringIntent;
            console.log(intent);
            
            if (intent.intent == "bug" && intent.score > .50 
                || intent.intent == "None" && intent.score < .40 ) {
                //this is a bug we should report to jira
                var template = {
                    "fields": {
                       "project":
                       { 
                        "key": "JOT"
                       },
                       "summary": "JOTTr Submitted Bug",
                       "description": qs,
                       "issuetype": {
                        "name": "Bug"
                    }
                   }
                }
                submitJira(template, function(err1, resp1) {
                    
                   callback(err1, resp1);
                   return;
                })
            } else {
                callback(false, {body: null});
                return;
            }

        } catch (e) {
            console.log(e);
            callback(true, null)
            return;
        }
    });
}
    


//populate what I want
bcrypt.genSalt(saltRounds, function(err, salt) {
  bcrypt.hash("ddd", salt, function(err, hash) {
      // Store hash in your password DB.
      client.set('creds', JSON.stringify({"dd":hash}));
      console.log(hash)
      
  });
});
// users
bcrypt.genSalt(saltRounds, function(err, salt) {
    bcrypt.hash("mypass", salt, function(err, hash) {
        // Store hash in your password DB.
        client.get("creds", function(err, reply) {
            reply = JSON.parse(reply);
            reply["varun"] = hash;
            client.set('creds', JSON.stringify(reply));
            
        });
        console.log(hash)
        
    });
  });



function createUser(user, pass) {
    bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(pass, salt, function(err, hash) {
            // Store hash in your password DB.
            client.get("creds", function(err, reply) {
                reply = JSON.parse(reply);
                reply[user] = hash;
                client.set('creds', JSON.stringify(reply));
                
            });
            console.log(hash)
            
        });
      });
}





function submitJira(jiraForm, callback) {
    var options = {
        json: true,
        headers: 
       { "Content-Type": "application/json"},
       username: config.JIRA_USER,
       password: config.JIRA_PASS
     }
    needle.post(config.JIRA_URL, jiraForm, options, function(err, resp) {
        callback(err, resp);
    });
}



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


app.get('/register', function(req, res) {
    var user = req.query.user;
    var pass = req.query.pass;
    client.get('creds', function(err, reply) {
        reply = JSON.parse(reply);
        if (typeof reply[user] != 'undefined') {
            res.send({"status" : "FAILURE" , "reason" : "user exists!"});
            return;
        }
        createUser(user, pass);
        res.send({"status" : "SUCCESS"});
        
    });

    

});

app.get("/", function(req, res) {

})



server.listen(port, function () {
  console.log("server running on port: " + port.toString())
})


