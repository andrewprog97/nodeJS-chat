const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server);
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

app.use(express.static("assets"));
app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile( __dirname + "/assets/index.html");
});

io.on("connection", async (socket) => {
    socket.on("change-channel", (data) => {
        [...socket.rooms].forEach(e => socket.leave(e))
        socket.join(data.newChannel);
    });
    socket.on("get-history", async (channelID) => {
        const db = await open({filename: "./database/base.db", driver: sqlite3.Database});
        const messages = (await db.all("SELECT * FROM messages WHERE channelID = (?)", [channelID])).map(e => ({
            message: e.message,
            userName: e.userName,
            history: true
        }));
        socket.emit("message-response", messages);
        await db.close();
    });
    socket.on("message-send", async (data) => {
        const db = await open({filename: "./database/base.db", driver: sqlite3.Database});
        await db.run(`INSERT INTO messages (userName, message, channelID) VALUES (?, ?, ?)`, [data.userName, data.message, [...socket.rooms][0]]);
        await db.close();
        io.to([...socket.rooms][0]).emit("message-response", [{
            message: data.message,
            userName: data.userName
        }]);
    });
});

server.listen(3000);