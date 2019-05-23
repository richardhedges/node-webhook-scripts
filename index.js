const express = require('express');
const app = express();
const runCmd = require('./runcmd');
const cfg = require('./config');
const hooks = require('./hooks.js');

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const verbose = process.env.VERBOSE ? true : false;

// For each path in hooks.json attach to our router
hooks.forEach(hook => {
  if(!hook.path) {
    throw new Error('Missing hook path in hooks.js');
  }

  // Function
  if(hook.func) {
    app[hook.method.toLocaleLowerCase() || "get"](hook.path, hook.func);
  }
  // Script
  else {
    if(!hook.command) {
      throw new Error('Missing hook command in hooks.js for path : ' + hook.path);
    }

    if(!hook.cwd) {
      throw new Error('Missing cwd in hooks.js for path : ' + hook.path);
    }

    app[hook.method.toLowerCase() || "get"](hook.path, function (req, res, next) {
      if(cfg.token && (req.headers.token !== cfg.token && req.query.token !== cfg.token)) {
        return res.status(403).send('Forbidden');
      }
      return next();
    },function(req, res) {
      if(verbose) {
        console.log(`webhook ${hook.method.toUpperCase()} ON ${hook.path}`);
      }

      // console.log(req.body.push.changes);

      var changes = req.body.push.changes;
      var init = false;

      for (let change of changes) {

        if (typeof change.old != 'undefined' || typeof change.new != 'undefined') {

          if (
            (
              typeof change.old.type != 'undefined'
            && typeof change.old.name != 'undefined'
            && change.old.type == 'branch'
            && change.old.name == 'dev'
            ) || (
              typeof change.new.type != 'undefined'
            && typeof change.new.name != 'undefined'
            && change.new.type == 'branch'
            && change.new.name == 'dev'
            )
          ) {
            init = true;
            break;
          }

        }

      }

      if (init) {

        runCmd(hook.command, hook.cwd)
          .then(stdout => {
            return res.send('DONE : ' + stdout + "\n");
          })
          // need to implement this catch below but for now it incorrectly throws an error on `git pull` so its commented out
          // .catch(err => {
          //   console.log(err);
          //   return res.status(500).send('ERROR : ' + err.message + "\n");
          // })

      } else {
        return res.status(200).send('DONE : No changes to sync' + "\n");
      }

    });
  }
})

app
.post('/*', function(req, res) {
  return res.status(404).send('Not found');
})
.get('/*', function(req, res) {
  return res.status(404).send('Not found');
})
.put('/*', function(req, res) {
  return res.status(404).send('Not found');
})
.delete('/*', function(req, res) {
  return res.status(404).send('Not found');
})

app.listen(cfg.port, function() {
  console.log(`listening on ${cfg.port}`);
})