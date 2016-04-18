var express = require("express");
var cookies = require("cookie-parser");
var body = require("body-parser");
var cfenv = require('cfenv');
appEnv = cfenv.getAppEnv();
var app = express();

app.use(body.json());
app.use(body.text());
app.use(cookies());

var usuarios = {
  "joseluis": {
    login: "joseluis",
    password: "plisu",
    nombre: "José Luis",
    ultimoToken: "token1"
  },
  "ezequiel": {
    login: "ezequiel",
    password: "memelord",
    nombre: "Ezequiel",
    ultimoToken: "token2"
  }
}

var conversaciones = [{
  id: 0,
  participantes: [],
  mensajes: []
}, {
  id: 1,
  participantes: ["joseluis", "ezequiel"],
  mensajes: [{
    creador: "joseluis",
    contenido: "hola"
  }, {
    creador: "ezequiel",
    contenido: "hola pepelu"
  }, {
    creador: "joseluis",
    contenido: "..."
  }]
}];

var tokens = {
  "token1": "joseluis",
  "token2": "ezequiel"
}

function ParticipantesEnConversacion(participante, conversacion) {
  for (var i = 0; i < conversacion.participantes.length; i++) {
    if (conversacion.participantes[i] === participante) {
      return true;
    }
  }
  return false;
}

app.get("/", function(req, res) {
  res.send(
    "get  /usuarios/:usuario<br>" +
    "get  /usuarios/:usuario/token<br>" +
    "get  /conversaciones<br>" +
    "get  /conversaciones/:id<br>" +
    "post /conversaciones/:id/mensaje<br>" +
    "");
});

app.get("/usuarios/:usuario", function(req, res) {
  var us = req.params.usuario;
  var token = req.cookies.token;

  if (!(us in usuarios)) {
    res.status(404).send("Meme " + us + " not found.");
  } else {
    var usuario = usuarios[us];
    if (token !== usuario.ultimoToken) {
      res.status(401).send("Meme not authorized");
    } else {
      res.send("Hola " + usuario.nombre);
    }
  }
});

app.get("/usuarios/:usuario/token", function(req, res) {
  var us = req.params.usuario;
  var pass = req.query.password;
  var usuario = usuarios[us];

  if (!usuario || usuario.password !== pass) {
    res
      .status(404)
      .send("Bad password-user pair.")
  } else {
    res
      .cookie("token", usuarios[us].ultimoToken)
      .send("Ok");
  }
});

app.get("/conversaciones", function(req, res) {
  var token = req.cookies.token;
  if (token in tokens) {
    var us = tokens[token];
    var arr = conversaciones.filter(function(v) {
      return ParticipantesEnConversacion(us, v);
    }).map(function(v) {
      return v.id;
    });
    res.send(JSON.stringify(arr));
  } else {
    res.status(401).send("Meme not authorized");
  }
});

app.get("/conversaciones/:id", function(req, res) {
  var id = req.params.id;
  var token = req.cookies.token;
  var us = tokens[token];

  var conversacion = conversaciones[id];
  if (!conversacion) {
    res.status(404).send("Not found your meme");
  } else {
    if (token && us && ParticipantesEnConversacion(us, conversacion)) {
      res.send(JSON.stringify(conversacion));
    } else {
      res.status(401).send("You are not authorized to see this meme")
    }
  }
});

app.post("/conversaciones/:id/mensaje", function(req, res) {
  var id = req.params.id;
  var mensaje = req.body;
  var token = req.cookies.token;
  var us = tokens[token];
  var conversacion = conversaciones[id];

  if (!conversacion) {
    res.status(404).send("Not found your meme");
  } else {
    if (token && us && ParticipantesEnConversacion(us, conversacion)) {
      conversacion.mensajes.push({
        creador: us,
        contenido: mensaje
      });
      res.send("Ok");
    } else {
      res.status(401).send("You are not authorized to see this meme")
    }
  }
});

app.listen(appEnv.port || 80);
