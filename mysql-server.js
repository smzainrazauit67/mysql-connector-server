const express = require('express');
const app = express();
const http = require("http");
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const mysql = require('mysql');
// const spawn = require('child_process').spawn;
// const { exec } = require('child_process');
let records;
const server = http.createServer(app);
const port = process.env.PORT || 4120;
const axios = require("axios");
const moment = require("moment");

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// function reloadFile() {
//   fs.readFile('C:/ProgramData/MySQL/MySQL Server 8.0/Data/sami/sami.log', 'utf8', (err, data) => {
//     if (err) throw err;
//     console.log(`beep`);
//   });
// }


io.on('connection', (socket) => {
  console.log("Socket Connected");
  
  socket.on("mysql-logs", (data) => {
    console.log("=== creating stream ===");
    // .on('data', (chunk) => {
    //   const lines = chunk.toString().split('\n').slice(-10);
    //   // console.log(lines)
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        // console.log(typeof records[i])
        if (records) socket.emit('mysql-logs', records[i]);
        }, i * 1500);
      // socket.emit('mysql-logs', records[i])
      }

  });

  socket.on("watch-logs", () => {
    // fs.watchFile('C:/ProgramData/MySQL/MySQL Server 8.0/Data/mysql/general_log.CSV', (curr, prev) => {
      fs.watchFile('/var/lib/mysql/mysql/general_log.CSV', (curr, prev) => {
        if (curr.mtime !== prev.mtime ) {
          console.log(`Change Detected!`); 
          // fs.createReadStream("C:/ProgramData/MySQL/MySQL Server 8.0/Data/mysql/general_log.CSV")
          fs.createReadStream("/var/lib/mysql/mysql/general_log.CSV")
          .on('data', (chunk) => {
            const lines = chunk.toString().split('\n').slice(-2);
            const resLines = {resLine: lines}
            socket.emit('watch-logs', resLines);
          })

        }});

  })


  
  socket.on("disconnect", () => {
    console.log("user disconnected");
    });

  });
  

  //     exec('tail -n 1 /var/log/syslog', (err, stdout, stderr) => {
  //       if (err) {
  //         console.error(err);
  //         return;
  //       }
  //       // console.log(stdout);
  //       socket.emit('linux-logs', { lineData: stdout, lineNum: 0});
  //     });
  //   }
  // });


// app.use(cors());
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

app.post('/api/sqlconnection', function (req, res) {
  const { host, user, password, database } = req.body;
  // console.log('User Details: ', req.body);
  // fs.chmod('C:/ProgramData/MySQL/MySQL Server 8.0/Data/mysql/general_log.CSV', 0o777, (err) => {
  fs.chmod('/var/lib/mysql/mysql/general_log.CSV', 0o777, (err) => {
    if (err) throw err;
    console.log('File permissions changed successfully!');
  });
  const connection = mysql.createConnection({
    user: user,
    host: host,
    password: password,
    database: database,
    insecureAuth : true,
    socketPath: '/var/run/mysqld/mysqld.sock'
  });
  connection.connect((error) => {
    if(error) {
      console.log('Error connecting: ' + error.message);
      return;
    }
    console.log('Connection: Established sucessfully'); 
    // res.send('Connection: Established sucessfully');
  })
  connection.query("SELECT DATE_FORMAT(event_time, '%d-%b-%Y %H:%i:%s') AS et, server_id, command_type ,CONVERT(argument USING utf8) AS qu FROM general_log order by event_time desc LIMIT 50;", function (err, result) {
    if (err) {
        console.log('Error on query: ' + err.message);
        return;
        }
        const currentTime = moment().format('MMMM Do YYYY hh:mm:ss a');
        const strResult = JSON.stringify(result);
        // console.log(strResult);
        axios.post("http://172.104.174.187:4000/api/add-history", 
        {
          id: 22, 
          con_type: "MySQL", 
          timestamp: currentTime
        });
        axios.post("http://172.104.174.187:4000/api/set/arch-logs", 
        { 
          user_id: 22,
          data_src: "MySQL",
          log_data: strResult
        });
      console.log("Query: Successful");
      records = result;
      console.log('# of records: ', records.length);
      res.send(records);
})
  });

app.listen(port, () => {
  console.log(`App started on port: ${port}`)
})

server.listen(port+10, () => {
  console.log(`Socket port: ${port+10}`)
})
