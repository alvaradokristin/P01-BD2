const express = require("express");
const multer = require("multer");
const fs = require("fs");
const JSZip = require("jszip");
const { promisify } = require("util");
const app = express();
const bodyParser = require("body-parser");

const sqlCon = require("./sqldatabase");
const neo4jCon = require("./neo4jdatabase");
const moment = require("moment");

const uploadsql = multer({ dest: "sqluploads" });

//conexion a Redis
const redis = require("redis");
const bcrypt = require("bcrypt");

const redisURL = "redis://127.0.0.1:6379";

const client = redis.createClient(redisURL);
client.connect();

client.on("error", (err) => console.log("Redis Server Error", err));

//Constantes para salt en el password
const { hashSync, genSaltSync, compareSync } = require("bcrypt");

app.use(bodyParser.urlencoded({ extended: true }));

const path = require("path");
const { render } = require("ejs");
const mongoCon = require("./mongodb.js");
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

let mongo;

//dependencias para redis de json
app.use(express.json());

let current_user = "test123";
let contador = 1;
function upContador() {
  contador++;
}

//gets para el login o register y new home
app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

//cambié el '/' por start
app.get("/start", async (req, res) => {
  let query =
    "MATCH (d:Dataset) RETURN ID(d) AS id, d.user AS userCreator, d.nombre AS nombre, d.descripcion AS descripcion, d.fecha AS fecha";
  const datasetResults = await neo4jCon(query);
  res.render("index", { datasets: datasetResults, cuser: current_user });
});

app.get("/modal", (req, res) => {
  console.log(
    "Este es un test, aca deberia hacer algo para tomar las notificaciones y ponerlar en el modal"
  );
});

app.post("/searchElement", async (req, res) => {
  const text = req.body.searchText;
  // search if the text is an username
  try {
    try {
      // search if the text is the name of a dataset and open the dataset page
      let neoQuery = `MATCH(d:Dataset) WHERE d.nombre = "${text}" RETURN ID(d) AS id, d.user AS userCreator, d.nombre AS nombre, d.descripcion AS descripcion, d.fecha AS fecha`;
      const datasetResults = await neo4jCon(neoQuery);
      sqlCon.query(
        "CALL get_files_from_dataset(?);",
        [datasetResults[0].id],
        async (err, result) => {
          if (err) throw err;
          let preview = result[0][0].data.toString("utf8").substring(0, 550);
          const commentsCollection = mongo.collection("Comments");
          const comments = await commentsCollection.find().toArray();
          console.log(comments);
          res.render("./dataset", {
            dsData: datasetResults[0],
            files: result[0][0],
            preview: preview,
            comments: comments,
          });
        }
      );
    } catch (error) {
      // search if the text is the name of a user and open the user page
      let savedUser = await client.hGet(text, "username");
      if (savedUser === null) {
        throw err;
      }
      const querydataset = `MATCH (d:Dataset)
      WHERE d.user = "${savedUser}"
      RETURN ID(d) AS id, d.user AS userCreator, d.nombre AS nombre, d.descripcion AS descripcion, d.fecha AS fecha`;
      const datasetResults = await neo4jCon(querydataset);
      let query = `SELECT is_following('${savedUser}', '${current_user}') AS following;`;
      sqlCon.query(query, function (err, result) {
        if (err) throw err;
        res.render("./user", {
          dataset: datasetResults,
          suser: savedUser,
          cuser: current_user,
          following: result[0],
        });
      });
    }
  } catch (error) {
    res.render("./searchnotfound");
  }
});


app.get("/dataset/:id", async (req, res) => {
  const dsId = req.params.id;
  loadDataComments(dsId, res);
});
  async function loadDataComments (dsId, res){
      
    const query = `MATCH (d:Dataset)
      WHERE ID(d) = ${dsId}
      RETURN ID(d) AS id, d.user AS userCreator, d.nombre AS nombre, d.descripcion AS descripcion, d.fecha AS fecha`;
  
    const datasetResults = await neo4jCon(query);
    console.log(dsId);
    sqlCon.query(
      "CALL get_files_from_dataset(?);",
      [dsId],
      async (err, result) => {
        console.log(result);
        if (err) throw err;
        
        let preview = result[0][0].data.toString("utf8").substring(0, 550);
  
        const commentsCollection = mongo.collection("Comments");
        const comments = await commentsCollection.find({datasetid:dsId}).toArray();
        console.log(comments);
  
        res.render("./dataset", {
          dsData: datasetResults[0],
          files: result[0][0],
          preview: preview,
          comments: comments,
        });
      }
    );
  };

app.post("/addComment/:dsid", (request, response) => {
  const idds = request.params.dsid;
  const commentsCollection = mongo.collection("Comments");
  commentsCollection.insertOne({
    datasetid: idds,
    userid: current_user,
    comment: request.body.comment,
    created_at: moment().format("DD/MM/YYYY - hh:MM"),
  });
  loadDataComments(idds, response);
});

app.get("/conversations", (req, res) => {
  let query = `CALL get_users_with_messages('${current_user}');`;
  sqlCon.query(query, function (err, result) {
    if (err) throw err;
    res.render("./conversations", {
      msgdata: result[0],
      current_user: current_user,
    });
  });
});

app.get("/msgconversation/:fuser/:suser", (req, res) => {
  const fuser = req.params.fuser;
  const suser = req.params.suser;

  let query = `CALL get_messages_from_conversation('${fuser}', '${suser}');`;
  sqlCon.query(query, function (err, result) {
    if (err) throw err;
    res.render("./msgconversation", {
      msgdata: result[0],
      current_user: fuser,
      secuser: suser,
    });
  });
});

//app.posts del login y register
//registrando un usuario
app.post("/register", async (req, res) => {
  try {
    console.log(req.body);
    const username = req.body.username;
    let password = req.body.password;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const dateOfBirth = req.body.dateOfBirth;
    // contador será userId

    if (!firstName || !lastName || !username || !dateOfBirth || !password) {
      return res.sendStatus(400);
    }

    //Check if username exists in the database
    let comparador = await client.hGet(username, "username");

    if (comparador === username) {
      return res.status(409).send("Username already taken");
    }

    //encriptar contraseña
    const salt = bcrypt.genSaltSync(10);
    let hashedPassword = bcrypt.hashSync(password, salt);

    client
      .multi()
      .hSet(username, "firstName", firstName)
      .hSet(username, "lastName", lastName)
      .hSet(username, "username", username)
      .hSet(username, "userId", contador)
      .hSet(username, "dateOfBirth", dateOfBirth)
      .hSet(username, "password", hashedPassword)
      .exec((err, replies) => {
        if (err) {
          console.log(err);
          return res.sendStatus(500);
        } else {
          console.log(replies);
          return res.sendStatus(200);
        }
      });
    upContador();
    res.send(
      '<script>alert("Registration successful!"); window.location.href="/login";</script>'
    );
    //    res.redirect('/login');
  } catch (e) {
    console.log(e);
    res.sendStatus(400);
  }
});

app.post("/login", async (req, res) => {
  try {
    console.log(req.body);
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
      return res.sendStatus(400);
    }

    var savedUser = await client.hGet(username, "username");

    if (savedUser === username) {
      var savedPassword = await client.hGet(username, "password");
      bcrypt.compare(password, savedPassword, (err, result) => {
        if (err) {
          console.error(error);
          return res.status(500).send("Internal Server Error");
        }
        if (!result) {
          return res.status(401).send("Invalid Username or Password");
        }
        //user authenticated
        current_user = username;
        return res.redirect("/start");
      });
    }
  } catch (e) {
    console.log(e);
    res.sendStatus(400);
  }
});

app.post("/sendmsg/:fuser/:suser", uploadsql.single("file"), (req, res) => {
  const fuser = req.params.fuser;
  const suser = req.params.suser;

  let uploadData = {};
  try {
    uploadData = {
      path: req.file.path,
      filetype: req.file.mimetype,
      filename: req.file.filename,
      sender: fuser,
      receiver: suser,
      message: req.body.message,
    };

    const data = fs.readFileSync(uploadData.path);

    sqlCon.query(
      "CALL send_message_w_file(?, ?, ?, ?, ?, ?);",
      [
        uploadData.sender,
        uploadData.receiver,
        uploadData.message,
        uploadData.filename,
        uploadData.filetype,
        data,
      ],
      (err, result) => {
        if (err) throw err;
        res.render("./msgconversation", {
          msgdata: result[0],
          current_user: fuser,
          secuser: suser,
        });
      }
    );

    // delete the file from sqluploads
    fs.unlinkSync(uploadData.path);
  } catch (error) {
    uploadData = {
      sender: fuser,
      receiver: suser,
      message: req.body.message,
    };

    let query = `CALL send_message("${uploadData.sender}", "${uploadData.receiver}", "${uploadData.message}");`;

    sqlCon.query(query, function (err, result) {
      if (err) throw err;
      res.render("./msgconversation", {
        msgdata: result[0],
        current_user: fuser,
        secuser: suser,
      });
    });
  }
});

app.get("/user/:id", async (req, res) => {
  const seluser = req.params.id;

  const querydataset = `MATCH (d:Dataset)
    WHERE d.user = "${seluser}"
    RETURN ID(d) AS id, d.user AS userCreator, d.nombre AS nombre, d.descripcion AS descripcion, d.fecha AS fecha`;
  const datasetResults = await neo4jCon(querydataset);

  let query = `SELECT is_following('${seluser}', '${current_user}') AS following;`;
  sqlCon.query(query, function (err, result) {
    if (err) throw err;
    res.render("./user", {
      dataset: datasetResults,
      suser: seluser,
      cuser: current_user,
      following: result[0],
    });
  });
});

app.get("/follow/:id/:action", async (req, res) => {
  const seluser = req.params.id;
  const action = req.params.action;

  const querydataset = `MATCH (d:Dataset)
    WHERE d.user = "${seluser}"
    RETURN ID(d) AS id, d.user AS userCreator, d.nombre AS nombre, d.descripcion AS descripcion, d.fecha AS fecha`;
  const datasetResults = await neo4jCon(querydataset);

  let query = "";

  if (action === "follow") {
    query = `CALL add_follower('${current_user}', '${seluser}');`;
  } else {
    query = `CALL unfollow_user('${current_user}', '${seluser}');`;
  }

  sqlCon.query(query, function (err, result) {
    if (err) throw err;
    res.render("./user", {
      dataset: datasetResults,
      suser: seluser,
      cuser: current_user,
      following: result[0][0],
    });
  });
});

//Cambiar información de usuario
//app.post('/generaluser', (req, err) =>{});
app.get("/generaluser", (req, res) => {
  
});

app.post('/generaluser', async (req, res) => {
  const newName = req.body.firstName;
  const newLastName = req.body.lastName;
  const newDateOfBirth = req.body.dateOfBirth;
  const newPassword = req.body.password;
  
  //encriptar contraseña
  const salt = bcrypt.genSaltSync(10);
  let hashedPassword = bcrypt.hashSync(newPassword, salt);

  if (!newName || !newLastName || !newDateOfBirth || !newPassword) {
    return res.sendStatus(400);
  }

  //hacer sets para nueva info y luego mandar mensaje de exito o error
  //Por hacer
  client
    .multi()
    .hSet(current_user, "firstName", newName)
    .hSet(current_user, "lastName", newLastName)
    .hSet(current_user, "dateOfBirth", newDateOfBirth)
    .hSet(current_user, "password", hashedPassword)
    .exec((err, replies) => {
      if (err) {
        console.log(err);
        return res.sendStatus(500);
      } else {
        console.log(replies);
        return res.sendStatus(200);
      }
    });
    
    console.log("Se cambio la info"  );
    res.send(
      '<script>alert("Se cambio la información exitosamente!"); window.location.href="/start";</script>'
    );
});

app.get("/image/:id", (req, res) => {
  const id = req.params.id;

  sqlCon.query(
    "SELECT data, filetype FROM message_attachments WHERE id = ?",
    [id],
    (error, results) => {
      const data = results[0].data;
      const filetype = results[0].filetype;

      // send the image as a response
      res.contentType(filetype);
      res.send(data);
    }
  );
});

app.post(
  "/addDataset",
  uploadsql.fields([{ name: "file" }, { name: "imgFile" }]),
  async (req, res) => {
    let uploadData = {};
    try {
      uploadData = {
        userCreator: current_user,
        nombre: req.body.dsName,
        descripcion: req.body.dsdescription,
        dsFile: fs.readFileSync(req.files.file[0].path),
        dsFileName: req.files.file[0].originalname,
        fileType: req.files.file[0].mimetype,
        dsImage: fs.readFileSync(req.files.imgFile[0].path),
        dsImageName: req.files.imgFile[0].originalname,
        imageType: req.files.imgFile[0].mimetype,
      };
    } catch (error) {
      uploadData = {
        userCreator: current_user,
        nombre: req.body.dsName,
        descripcion: req.body.dsdescription,
        dsFile: fs.readFileSync(req.files.file[0].path),
        dsFileName: req.files.file[0].originalname,
        fileType: req.files.file[0].mimetype,
        dsImage: null,
        dsImageName: null,
        imageType: null,
      };
    }

    let fecha = moment().format("YYYY-MM-DD");
    let tamanno = req.files.file[0].size / 1000000; // file size in megabytes

    const query = `CREATE (d:Dataset {user: "${uploadData.userCreator}", nombre: "${uploadData.nombre}", 
    descripcion: "${uploadData.descripcion}", fecha: date("${fecha}"), tamanno: ${tamanno} })
    RETURN ID(d) AS id, d.user AS userCreator, d.nombre AS nombre, d.descripcion AS descripcion, d.fecha AS fecha`;

    const datasetResults = await neo4jCon(query);

    sqlCon.query(
      "CALL add_dataset_files(?, ?, ?, ?, ?, ?, ?);",
      [
        datasetResults[0].id,
        uploadData.dsFileName,
        uploadData.fileType,
        uploadData.dsFile,
        uploadData.dsImageName,
        uploadData.imageType,
        uploadData.dsImage,
      ],
      async (err, result) => {
        if (err) throw err;

        let preview = result[0][0].data.toString("utf8").substring(0, 550);

        const commentsCollection = mongo.collection("Comments");
        const comments = await commentsCollection.find({datasetid:datasetResults[0].id}).toArray();
        console.log(comments);

        res.render("./dataset", {
          dsData: datasetResults[0],
          files: result[0][0],
          preview: preview,
          comments: comments
        });
      }
    );

    fs.unlinkSync(req.files.file[0].path);

    if (req.files.imgFile && req.files.imgFile[0]) {
      fs.unlinkSync(req.files.imgFile[0].path);
    }
  }
);

app.get("/download/:id", (req, res) => {
  const datasetId = req.params.id;

  const sql = "CALL get_files_from_dataset(?);";
  const params = [datasetId];

  sqlCon.query(sql, params, async (error, results) => {
    if (error) throw error;
    
    const fileData = await results[0][0].data;
    const fileName = await results[0][0].filename;

    const imageData = await results[0][0].image_data;
    const imageName = await results[0][0].image_name;

    // creates the zip file
    const zip = new JSZip();

    fs.writeFile(fileName, fileData, async (error) => {
      if (error) throw error;

      // adds the file to the zip file
      let fileContent = await fs.promises.readFile(fileName);
      zip.file(fileName, fileContent);

      // generates the zip file
      const zipData = await zip.generateAsync({ type: "nodebuffer" });

      // creates the image if exist and adds it to the zip file
      try {
        fs.writeFile(imageName, imageData, async (error) => {
          if (error) throw error;

          // add existing file
          const existingZip = await JSZip.loadAsync(zipData);

          // adds the file to the zip file
          let imageContent = await fs.promises.readFile(imageName);
          zip.file(imageName, imageContent);
          existingZip.folder("images").file(imageName, imageContent);

          // add the forlder to the original zip
          zip.loadAsync(
            await existingZip.generateAsync({ type: "nodebuffer" })
          );

          // create the final zip file
          const finalZipData = await zip.generateAsync({ type: "nodebuffer" });

          // writes the zip file to disk
          fs.writeFile("dataset.zip", finalZipData, async (error) => {
            if (error) throw error;

            const zipContent = await fs.promises.readFile("dataset.zip");
            const zipName = "dataset.zip";

            // send the file to the browser to download it
            res.set("Content-Type", "application/octet-stream");
            res.set("Content-Disposition", `attachment; filename=${zipName}`);
            res.set("Content-Length", zipContent.length);
            res.send(zipContent);

            // delete the files from disk
            fs.unlink(fileName, (error) => {
              if (error) throw error;
            });

            fs.unlink(imageName, (error) => {
              if (error) throw error;
            });

            fs.unlink("dataset.zip", (error) => {
              if (error) throw error;
            });
          });
        });
      } catch {
        // writes the zip file to disk
        fs.writeFile("dataset.zip", zipData, async (error) => {
          if (error) throw error;

          const zipContent = await fs.promises.readFile("dataset.zip");
          const zipName = "dataset.zip";

          // send the file to the browser to download it
          res.set("Content-Type", "application/octet-stream");
          res.set("Content-Disposition", `attachment; filename=${zipName}`);
          res.set("Content-Length", zipContent.length);
          res.send(zipContent);

          // delete the files from disk
          fs.unlink(fileName, (error) => {
            if (error) throw error;
          });

          fs.unlink("dataset.zip", (error) => {
            if (error) throw error;
          });
        });
      }
    });
  });
});

app.listen(3000, async function () {
  sqlCon.connect(function (err) {
    if (err) throw err;
    console.log("SQL Database Connected!");
  });
  mongo = await mongoCon();
});
