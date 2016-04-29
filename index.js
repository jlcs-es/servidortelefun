var express = require("express");
var cookies = require("cookie-parser");
var body = require("body-parser");
var cfenv = require('cfenv');
appEnv = cfenv.getAppEnv();
var app = express();

app.set('view engine', 'pug');
app.use(body.text());
app.use(body.json());
app.use(cookies());
app.use('/js/jquery', express.static('node_modules/jquery/dist'));

var usuarios = {
  "joseluis": {
    login: "joseluis",
    password: "plisu",
    nombre: "José Luis",
    ultimoToken: "token1",
    contactos: [],
    esperas: []
  },
  "ezequiel": {
    login: "ezequiel",
    password: "memelord",
    nombre: "Ezequiel",
    ultimoToken: "token2",
    contactos: [],
    esperas: ["joseluis"]
  }
}

var conversaciones = [{
  id: 0,
  participantes: [],
  mensajes: []
}];

var tokens = {

}

function ParticipantesEnConversacion(participante, conversacion) {
  for (var i = 0; i < conversacion.participantes.length; i++) {
    if (conversacion.participantes[i] === participante) {
      return true;
    }
  }
  return false;
}

function partialClone(object) {
  var keys = Array.prototype.slice.call(arguments, 1);
  var res = {};
  for (var i = 0; i < keys.length; i++) {
    res[keys[i]] = object[keys[i]];
  }
  return res;
}

app.get("/", function(req, res) {
  res.send(
    "get  /usuarios/:usuario<br>" +
    "get  /usuarios/:usuario/token<br>" +
    "get  /conversaciones<br>" +
    "get  /conversaciones/:id<br>" +
    "get  /contactos<br>" +
    "post /conversaciones<br>" +
    "post /conversaciones/:id/mensaje<br>" +
    "post /usuarios/:usuario/<br>" +
    "");
});

app.get("/usuarios/:usuario", function(req, res) {
  var us = req.params.usuario;
  var token = req.cookies.token;
  var usuario = tokens[token];

  if (!usuario) {
    res.status(401).send("Meme not authorized");
  } else {
    usuario = usuarios[usuario];
    if (usuario.contactos.indexOf(us) > -1 || us === usuario.login) {
      var objUs = partialClone(usuarios[us], "login", "nombre");
      res.status(200).send(JSON.stringify(objUs));
    }
  }
});

app.post("/usuarios/:usuario", function(req, res) {
  var us = req.params.usuario;
  var token = req.cookies.token;
  var usuario = req.body;

  if (us in usuarios) {
    res.status(400).send("Meme " + login + " already memed.");
  } else {
    usuarios[us] = usuario;
    usuarios[us].login = us;
    res.status(200).send(JSON.stringify({
      status: "ok"
    }));
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
    usuarios[us].ultimoToken = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
    var oldtoken = Object.keys(tokens).filter(function(key) {
      return tokens[key] === us
    })[0];
    delete tokens[oldtoken];
    tokens[usuarios[us].ultimoToken] = us;
    console.log(tokens);
    res
      .cookie("token", usuarios[us].ultimoToken)
      .send("Ok");
  }
});

app.get("/contactos", function(req, res) {
  var token = req.cookies.token;
  var us = tokens[token];

  if (!(us in usuarios)) {
    if (!us) {
      res.status(401).send("Meme not authorized");
    } else {
      res.status(404).send("Meme " + us + " not found.");
    }
  } else {
    var usuario = usuarios[us];
    var obj = partialClone(usuario, "contactos", "esperas");
    res.status(200).send(JSON.stringify(obj));
  }
});

app.post("/contactos", function(req, res) {
  var token = req.cookies.token;
  var json = req.body;

  if (token in tokens) {
    var usuario = usuarios[tokens[token]];
    if (json && json.contacto) {
      var c = json.contacto;
      if (usuario.contactos.indexOf(c) != -1 || usuario.esperas.indexOf(c) != -1) {
        res.status(304).send("Meme not modified");
      } else {
        if (c in usuarios) {
          var cu = usuarios[c];
          var it;
          if ((it = cu.esperas.indexOf(usuario.login)) != -1) {
            cu.esperas.splice(it, it + 1);
            cu.contactos.push(usuario.login);
            usuario.contactos.push(c);
          } else {
            usuario.esperas.push(c);
          }
          res.status(200).send("{\"status\": \"ok\"}")
        } else {
          res.status(400).send("Bad meme");
        }
      }
    } else {
      res.status(400).send("Bad meme");
    }
  } else {
    res.status(400).send("Bad meme");
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
    res.status(200).send(JSON.stringify({conversaciones: arr}));
  } else {
    res.status(401).send("Meme not authorized");
  }
});

app.post("/conversaciones", function(req, res) {
  var token = req.cookies.token;
  var conversacion = req.body;
  if (token in tokens) {
    var usuario = usuarios[tokens[token]];
    if (conversacion.participantes && conversacion.participantes.length > 0) {
      for (var i = 0; i < conversacion.participantes.length; i++) {
        if (usuario.contactos.indexOf(conversacion.participantes[i]) === -1) {
          res.status(403).send("Meme not authorized");
          return;
        }
      }
      var conv = {
        participantes: conversacion.participantes,
        mensajes: []
      };
      conv.participantes.push(usuario.login);
      conv.id = conversaciones.push(conv) - 1;
      res.status(200).send(JSON.stringify({
        id: conv.id
      }));
    } else {
      res.status(400).send("Bad request");
    }
  } else {
    res.status(401).send("Meme not authorized");
  }
});

app.get("/conversaciones/:id", function(req, res) {
  var id = req.params.id;
  var token = req.cookies.token;
  var pag = req.query.n;
  var us = tokens[token];

  var conversacion = conversaciones[id];
  if (!conversacion) {
    res.status(404).send("Not found your meme");
  } else {
    if (token && us && ParticipantesEnConversacion(us, conversacion)) {
      if (pag) {
        var obj = partialClone(conversacion, "id", "mensajes", "participantes");
        obj.mensajes = obj.mensajes.slice(pag);
        res.status(200).send(JSON.stringify(obj));
      } else {
        res.status(200).send(JSON.stringify(conversacion));
      }
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
    if (!mensaje || typeof mensaje.mensaje !== "string") {
      res.status(400).send("Bad meme");
      return;
    }
    if (token && us && ParticipantesEnConversacion(us, conversacion)) {
      conversacion.mensajes.push({
        creador: us,
        contenido: mensaje.mensaje
      });
      res.status(200).send(JSON.stringify({
        status: "ok"
      }));
    } else {
      res.status(401).send("You are not authorized to see this meme")
    }
  }
});

app.get("/conversaciones/:id/mensaje", function(req, res) {
  var id = req.params.id;
  var token = req.cookies.token;
  var us = tokens[token];
  var conversacion = conversaciones[id];

  if (!conversacion) {
    res.status(404).send("Not found your meme");
  } else {
    if (token && us && ParticipantesEnConversacion(us, conversacion)) {
      res.render("postmensaje", {
        title: "Enviar mensaje",
        message: "Escribe aquí el mensaje"
      });
    } else {
      res.status(401).send("You are not authorized to see this meme")
    }
  }
})

app.listen(appEnv.port, '0.0.0.0', function() {

  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
