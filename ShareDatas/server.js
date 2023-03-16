const express = require("express");
const app = express();

const path = require("path");

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

// may not be necessary or it should be changed
app.get("/", (req, res) => {
    res.render("index");
})

app.listen(3000);