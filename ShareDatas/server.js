const express = require("express");
const multer = require("multer");
const fs = require('fs');
const app = express();

const sqlCon = require("./sqldatabase");
const moment = require('moment');

const uploadsql = multer({ dest: "sqluploads" });

const path = require("path");
const { render } = require("ejs");

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

let current_user = 'usuario113';

app.get("/", (req, res) => {
    res.render("index", { cuser: current_user });
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

app.get("/user/:id", (req, res) => {
    const seluser = req.params.id;
    let query = `SELECT is_following('${seluser}', '${current_user}') AS following;`
    sqlCon.query(query, function (err, result) {
        if (err) throw err;
        res.render("./user", { suser: seluser, cuser: current_user, following: result[0] });
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

app.listen(3000, function () {
    sqlCon.connect(function (err) {
        if (err) throw err;
        console.log("SQL Database Connected!")
    })
});