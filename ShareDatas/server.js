const express = require("express");
const app = express();

// app.set('views', path.join(__dirname, 'views'));

const path = require("path");

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

// may not be necessary or it should be changed
app.get("/", (req, res) => {
    res.render("index");
})

app.get("/dataset", (req, res) => {
    res.render("./dataset");
});

app.get("/user", (req, res) => {
    res.render("./user");
});

app.listen(3000);