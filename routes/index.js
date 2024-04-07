const express = require('express');
let app = express();
const router = express.Router();
const execFile = require('child_process').execFile;
const path = require('path');

app.use(express.json());

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', {});
});

router.post('/', (req, res, next) => {
  let arg = req.body;
  const program = path.resolve(__dirname, '../cpp/api/visibilityInPolygon.exe');
  let child = execFile(program, [], function (error, stdout, stderr) {
    let points = stdout.split('\n').map((line) => {return line.split(' ').map((s) => parseInt(s));});
    points.pop();
    if (error) {
      console.log(error);
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      result: points
    }));
  });
  child.stdin.setEncoding('utf-8');
  child.stdin.write(arg.n + '\n');
  child.stdin.write(arg.nodes + '\n');
  child.stdin.write(arg.obs + '\n');
});

router.get('/motion', (req, res, next) => {
  res.render('motion', {});
});

module.exports = router;
