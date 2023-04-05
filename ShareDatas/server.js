const express = require("express");
const multer = require("multer");
const fs = require('fs');
const app = express();

const sqlCon = require("./sqldatabase");
const neo4jCon = require("./neo4jdatabase");
const moment = require('moment');

const uploadsql = multer({ dest: "sqluploads" });

const path = require("path");
const { render } = require("ejs");

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

let current_user = 'usuario113';

app.get("/", async (req, res) => {
    let query = "MATCH (d:Dataset) RETURN d.user AS userCreator, d.nombre AS nombre, d.descripcion AS descripcion, d.fecha AS fecha, d.tamanno AS tamanno";
    
    const datasetResults = await neo4jCon(query); 
    res.render("index", { datasets: datasetResults, cuser: current_user });
});

app.get('/modal', (req, res) => {
    console.log("Este es un test, aca deberia hacer algo para tomar las notificaciones y ponerlar en el modal")
});

app.get("/dataset/:name", (req, res) => {
    const name = req.params.name;
    res.render("./dataset", { dtsname: name });
});

app.get("/conversations", (req, res) => {
    let query = `CALL get_users_with_messages('${current_user}');`
    sqlCon.query(query, function (err, result) {
        if (err) throw err;
        res.render("./conversations", { msgdata: result[0], current_user: current_user });
    });
});

app.get("/msgconversation/:fuser/:suser", (req, res) => {
    const fuser = req.params.fuser;
    const suser = req.params.suser;

    let query = `CALL get_messages_from_conversation('${fuser}', '${suser}');`
    sqlCon.query(query, function (err, result) {
        if (err) throw err;
        res.render("./msgconversation", { msgdata: result[0], current_user: fuser, secuser: suser });
    });
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
            message: req.body.message
        };

        const data = fs.readFileSync(uploadData.path);

        sqlCon.query(
            'CALL send_message_w_file(?, ?, ?, ?, ?, ?);',
            [uploadData.sender, uploadData.receiver, uploadData.message, uploadData.filename, uploadData.filetype, data],
            (err, result) => {
                if (err) throw err;
                res.render("./msgconversation", { msgdata: result[0], current_user: fuser, secuser: suser });
            }
        );

        // delete the file from sqluploads
        fs.unlinkSync(uploadData.path);

    } catch (error) {
        uploadData = {
            sender: fuser,
            receiver: suser,
            message: req.body.message
        };

        let query = `CALL send_message("${uploadData.sender}", "${uploadData.receiver}", "${uploadData.message}");`

        sqlCon.query(query, function (err, result) {
            if (err) throw err;
            res.render("./msgconversation", { msgdata: result[0], current_user: fuser, secuser: suser });
        });
    }
});

app.get("/user/:id", async (req, res) => {
    const seluser = req.params.id;
    const querydataset = `MATCH (d:Dataset ) RETURN d.userCreator AS userCreator, d.nombre AS nombre, d.descripcion AS descripcion, d.fecha AS fecha, d.tamanno AS tamanno`;
    const datasetResults = await neo4jCon(querydataset);
    let query = `SELECT is_following('${seluser}', '${current_user}') AS following;`
    sqlCon.query(query, function (err, result) {
        if (err) throw err;
        res.render("./user", {dataset: datasetResults, suser: seluser, cuser: current_user, following: result[0] });
    });
});

app.get("/follow/:id/:action", (req, res) => {
    const seluser = req.params.id;
    const action = req.params.action;

    let query = "";

    if (action === "follow") {
        query = `CALL add_follower('${current_user}', '${seluser}');`;
    } else {
        query = `CALL unfollow_user('${current_user}', '${seluser}');`;
    }

    sqlCon.query(query, function (err, result) {
        if (err) throw err;
        res.render("./user", { suser: seluser, cuser: current_user, following: result[0][0] });
    });
});

app.get('/image/:id', (req, res) => {
    const id = req.params.id;

    sqlCon.query(
        'SELECT data, filetype FROM message_attachments WHERE id = ?',
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


app.get("/dstsusers", async (req, res) => {

    const { userCreator, nombre, descripcion, archivo, fecha, tamanno } = req.body;
    archivo = fs.readFileSync(req.file.path); 
    
    const query = `MATCH (d:Dataset {user: $userCreator, nombre: $nombre, 
    descripcion: $descripcion, archivo: $archivo, fecha: $fecha, tamanno: $tamanno})
    RETURN d`;
    
    const dataResults = await neo4jCon(query); 
    console.log(dataResults);
    fs.unlinkSync(uploadData.path);
    res.render('./user', { dataset: dataResults, cuser: current_user });
});

app.get("/user", async (req, res) => {
    const { user } = req.params;
  
    const query = `MATCH (d:Dataset {user: $user}) RETURN d`;
    const datasetResults = await neo4jCon(query, { user });
  
    res.render("user", { dataset: datasetResults, cuser: current_user });
});


app.post("/datasetAgre", uploadsql.single('file'), async (req, res) => {
    console.log("Entro");
    const { userCreator, nombre, descripcion, archivo, fecha, tamanno } = req.body;
    archivo = fs.readFileSync(req.file.path); 
    
    
    const query = `CREATE (d:Dataset {user: $userCreator, nombre: $nombre, 
    descripcion: $descripcion, archivo: $archivo, fecha: $fecha, tamanno: $tamanno})
    RETURN d`;
    
    
    const datasetResults = await neo4jCon(query); 
    fs.unlinkSync(uploadData.path);
    res.render("index", { datasets: datasetResults, cuser: current_user });
});


app.listen(3000, function () {
    sqlCon.connect(function (err) {
        if (err) throw err;
        console.log("SQL Database Connected!")
    })
});